import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse as parseYaml } from 'yaml'
import type { Plugin } from 'vite'
import {
  iconPackFiles,
  loadIconPackFile,
  collectIconIdsFromData,
  fetchRemoteSvgIcons,
  fetchRemoteSprite,
} from '../generate/iconPacks.ts'
import type { Namespaces } from '../generate/namespaces.ts'
import type { ResolveIconSource } from '../sdc.d.ts'
import { isRemoteUrl, jsLiteral, listDir } from '../utils.ts'
import { TWIG_FILE_RE } from '../constants.ts'

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

// Parsed content of every *.component.yml and *.story.yml under each
// namespace's components/ folder; unparseable files are skipped.
export function readNamespaceYamlData(namespaces: Namespaces): unknown[] {
  const out: unknown[] = []
  for (const [, root] of namespaces.entries()) {
    for (const entry of listDir(join(root, 'components'))) {
      if (entry.isDirectory) continue
      if (
        !entry.name.endsWith('.story.yml') &&
        !entry.name.endsWith('.component.yml')
      )
        continue
      try {
        out.push(parseYaml(readFileSync(entry.path, 'utf8')))
      } catch {
        /* skip unparseable */
      }
    }
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
import { ${factory} } from 'storybook-addon-sdc/renderer/${lib}';

export { PrintableArray } from 'storybook-addon-sdc/renderer/${lib}';

export const { renderIcon, registerSdcRuntime } = ${factory}(${mergeExpr});
`
}

// vite-plugin-twing-drupal >= 1.1.4 builds one shared environment in this
// virtual module instead of one per compiled template.
const TWING_ENV_ID = 'virtual:twing-env'
const TWING_ENV_LOADER_LINE =
  'const loader = createSDCLoader(allSources, twingNamespaces);'

// Templates are rendered by absolute path, but the shared module only
// registers an absolute key once that template's own module has been loaded,
// so any template loaded after the environment was first served is missing.
// Alias every template file's absolute path to the plugin's own relative key
// (relative to the namespace's template directory), guarded so nothing is
// overwritten and unknown keys are skipped.
export function twingEnvAliases(
  namespaces: Namespaces
): Array<[string, string]> {
  const pairs: Array<[string, string]> = []
  for (const dirs of Object.values(namespaces.toTwingNamespaces() ?? {})) {
    for (const dir of dirs) {
      for (const entry of listDir(dir)) {
        if (entry.isDirectory) continue
        if (!/\.(twig|svg)$/.test(entry.name)) continue
        pairs.push([entry.path, entry.relative])
      }
    }
  }
  return pairs
}

export function injectTwingEnvAliases(
  code: string,
  namespaces: Namespaces
): string {
  if (!code.includes(TWING_ENV_LOADER_LINE)) return code
  const aliasCode = `for (const [abs, rel] of ${jsLiteral(twingEnvAliases(namespaces))}) {
      if (!(abs in allSources) && rel in allSources) allSources[abs] = allSources[rel];
    }
    ${TWING_ENV_LOADER_LINE}`
  return code.replace(TWING_ENV_LOADER_LINE, aliasCode)
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
        const packFilePaths = iconPackFiles(namespaces).map(([, file]) => file)
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
          (p) => p.extractor === 'svg' && p.sources.some((s) => isRemoteUrl(s))
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
            pack.sources.some((s) => isRemoteUrl(s))
          ) {
            const content = await fetchRemoteSprite(pack, fetchSvgFromUrl)
            if (content) sprites[pack.packId] = content
          }
        }

        const injection =
          Object.keys(sprites).length > 0
            ? `
if (typeof document !== 'undefined') {
  var _sdcSprites = ${jsLiteral(sprites)};
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

        return `${injection}export default ${jsLiteral(packs)};`
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
      const isSharedEnv = id === TWING_ENV_ID
      if (!isSharedEnv && !TWIG_FILE_RE.test(id)) return null
      if (code.includes(INJECTED_GUARD)) return null
      if (isSharedEnv) code = injectTwingEnvAliases(code, namespaces)

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
