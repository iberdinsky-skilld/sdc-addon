import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse as parseYaml } from 'yaml'
import fetch from 'node-fetch'
import type { Plugin } from 'vite'
import {
  loadIconPackFile,
  collectIconIdsFromData,
  fetchRemoteSvgIcons,
  fetchRemoteSprite,
} from './icon-packs.ts'
import type { Namespaces } from './namespaces.ts'
import type { ResolveIconSource } from './sdc.d.ts'

const remoteSvgCache = new Map<string, string | null>()

async function fetchSvgFromUrl(url: string): Promise<string | null> {
  if (remoteSvgCache.has(url)) return remoteSvgCache.get(url) ?? null
  try {
    const res = await fetch(url)
    if (!res.ok) {
      remoteSvgCache.set(url, null)
      return null
    }
    const text = await res.text()
    remoteSvgCache.set(url, text)
    return text
  } catch {
    remoteSvgCache.set(url, null)
    return null
  }
}

function readNamespaceYamlData(namespaces: Namespaces): unknown[] {
  const out: unknown[] = []
  const walk = (dir: string) => {
    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
      } else if (
        entry.name.endsWith('.story.yml') ||
        entry.name.endsWith('.component.yml')
      ) {
        try {
          out.push(parseYaml(readFileSync(full, 'utf8')))
        } catch {
          /* skip unparseable */
        }
      }
    }
  }
  for (const [, root] of namespaces.entries()) {
    walk(join(root, 'components'))
  }
  return out
}

export const VIRTUAL_TWIG = 'virtual:sdc-twig-runtime:twig'
const RESOLVED_TWIG = '\0' + VIRTUAL_TWIG

export const VIRTUAL_TWING = 'virtual:sdc-twig-runtime:twing'
const RESOLVED_TWING = '\0' + VIRTUAL_TWING

const PACK_PREFIX = '\0icons-pack:'

function packImports(paths: string[]): { imports: string; mergeExpr: string } {
  const imports = paths
    .map((p, i) => `import _p${i} from '${PACK_PREFIX}${p}';`)
    .join('\n')
  const args = paths.map((_, i) => `_p${i}`).join(', ')
  return { imports, mergeExpr: args ? `Object.assign({}, ${args})` : '{}' }
}

// Thin glue passing the consumer's icon-pack data to the runtime factory.
// twing/drupal-attribute stay external there → same singletons as the renderer.
function generateRuntimeGlue(
  packFilePaths: string[],
  lib: 'twig' | 'twing'
): string {
  const { imports, mergeExpr } = packImports(packFilePaths)
  const factory = lib === 'twig' ? 'createTwigRuntime' : 'createTwingRuntime'

  return `
${imports}
import { ${factory} } from 'storybook-addon-sdc/runtime/${lib}';

export { PrintableArray } from 'storybook-addon-sdc/runtime/${lib}';

export const { renderIcon, renderInline, makeStory, registerSdcRuntime } =
  ${factory}(${mergeExpr});
`
}

const TWIG_JS_MARKER = "from 'drupal-twig-extensions/twig'"
const TWIG_JS_INJECT_AFTER = 'addDrupalExtensions(Twig);'
const TWING_MARKER = 'createSynchronousEnvironment'
const TWING_INJECT_AFTER = 'addDrupalExtensions(env);'
const INJECTED_GUARD = '_sdcRegisterRuntime'

export function sdcTwigRuntimePlugin(
  namespaces: Namespaces,
  resolveIconSource?: ResolveIconSource
): Plugin {
  return {
    name: 'vite-plugin-sdc-twig-runtime',

    resolveId(id: string) {
      if (id === VIRTUAL_TWIG) return RESOLVED_TWIG
      if (id === VIRTUAL_TWING) return RESOLVED_TWING
      if (id.startsWith(PACK_PREFIX)) return id
    },

    async load(id: string) {
      if (id === RESOLVED_TWIG || id === RESOLVED_TWING) {
        const packFilePaths = namespaces
          .entries()
          .map(([ns, root]) => join(root, `${ns}.icons.yml`))
          .filter((p) => existsSync(p))
        return generateRuntimeGlue(
          packFilePaths,
          id === RESOLVED_TWIG ? 'twig' : 'twing'
        )
      }

      if (id.startsWith(PACK_PREFIX)) {
        const filePath = id.slice(PACK_PREFIX.length)
        const { packs, watchFiles } = loadIconPackFile(
          filePath,
          resolveIconSource
        )
        watchFiles.forEach((f) => this.addWatchFile(f))

        // For svg packs with remote (CDN) sources, fetch and inline only the
        // icons actually referenced by stories/components.
        const remotePacks = Object.values(packs).filter(
          (p) =>
            p.extractor === 'svg' &&
            p.sources.some((s) => /^https?:\/\//.test(s))
        )
        if (remotePacks.length > 0) {
          const yamlData = readNamespaceYamlData(namespaces)
          for (const pack of remotePacks) {
            const used = new Set<string>()
            for (const data of yamlData) {
              collectIconIdsFromData(data, pack.packId, used)
            }
            await fetchRemoteSvgIcons(pack, used, fetchSvgFromUrl)
          }
        }

        // For svg_sprite packs with a remote (CDN) sprite, fetch it once and
        // inline it into the DOM (browsers block external `<use href>`).
        const sprites: Record<string, string> = {}
        for (const pack of Object.values(packs)) {
          if (
            pack.extractor === 'svg_sprite' &&
            pack.sources.some((s) => /^https?:\/\//.test(s))
          ) {
            const content = await fetchRemoteSprite(pack, fetchSvgFromUrl)
            if (content) sprites[pack.packId] = content
          }
        }

        const injection =
          Object.keys(sprites).length > 0
            ? `
if (typeof document !== 'undefined') {
  var _sdcSprites = ${JSON.stringify(sprites)};
  for (var _k in _sdcSprites) {
    var _elId = 'sdc-sprite-' + _k;
    if (!document.getElementById(_elId)) {
      var _d = document.createElement('div');
      _d.id = _elId;
      _d.style.display = 'none';
      _d.setAttribute('aria-hidden', 'true');
      _d.innerHTML = _sdcSprites[_k];
      document.body.appendChild(_d);
    }
  }
}
`
            : ''

        return `${injection}export default ${JSON.stringify(packs)};`
      }
    },

    handleHotUpdate({ modules, server }) {
      const hasIconPack = modules.some(
        (m) =>
          m.id === RESOLVED_TWIG ||
          m.id === RESOLVED_TWING ||
          (m.id?.startsWith(PACK_PREFIX) ?? false)
      )
      if (hasIconPack) {
        server.ws.send({ type: 'full-reload' })
        return []
      }
    },

    transform(code: string, id: string) {
      if (!id.match(/\.twig(\?.*)?$/)) return null
      if (code.includes(INJECTED_GUARD)) return null

      // Inject registerSdcRuntime(<env>) right after the lib sets up its env.
      const variants = [
        {
          marker: TWING_MARKER,
          after: TWING_INJECT_AFTER,
          virtual: VIRTUAL_TWING,
          arg: 'env',
        },
        {
          marker: TWIG_JS_MARKER,
          after: TWIG_JS_INJECT_AFTER,
          virtual: VIRTUAL_TWIG,
          arg: 'Twig',
        },
      ]
      for (const v of variants) {
        if (code.includes(v.marker) && code.includes(v.after)) {
          return {
            code:
              `import { registerSdcRuntime as ${INJECTED_GUARD} } from '${v.virtual}';\n` +
              code.replace(v.after, `${v.after}\n${INJECTED_GUARD}(${v.arg});`),
            map: null,
          }
        }
      }

      return null
    },

    configureServer(server) {
      namespaces.entries().forEach(([, root]) => server.watcher.add(root))

      server.watcher.on('add', (p) => {
        if (!p.endsWith('.icons.yml')) return
        for (const rid of [RESOLVED_TWIG, RESOLVED_TWING]) {
          const mod = server.moduleGraph.getModuleById(rid)
          if (mod) server.moduleGraph.invalidateModule(mod)
        }
        server.ws.send({ type: 'full-reload' })
      })
    },
  }
}
