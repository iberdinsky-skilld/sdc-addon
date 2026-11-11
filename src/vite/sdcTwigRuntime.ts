// Vite plugin serving the virtual Twig runtime and icon pack modules, and
// injecting registerSdcRuntime into compiled templates.
import type { ModuleNode, Plugin, Rollup } from 'vite'
import { iconPackFiles, loadIconPackFile } from '../generate/iconPacks.ts'
import { inlineRemoteIcons } from '../generate/remoteIcons.ts'
import type { TwingNamespaceRoots } from '../generate/namespaces.ts'
import { injectTwingEnvAliases, TWING_ENV_ID } from './twingSharedEnv.ts'
import type { ResolveIconSource } from '../sdc.d.ts'
import { jsLiteral } from '../utils.ts'
import { TWIG_FILE_RE } from '../constants.ts'

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

// Imports the runtime from the package so twing and drupal-attribute stay
// shared singletons.
function generateRuntimeGlue(
  packFilePaths: string[],
  lib: 'twig' | 'twing'
): string {
  const { imports, mergeExpr } = packImports(packFilePaths)
  const factory = lib === 'twig' ? 'createTwigRuntime' : 'createTwingRuntime'

  return `
${imports}
import { ${factory} } from 'storybook-addon-sdc/renderer/${lib}';

export { twigArgs } from 'storybook-addon-sdc/renderer/${lib}';

export const { renderIcon, registerSdcRuntime } = ${factory}(${mergeExpr});
`
}

const TWIG_JS_MARKER = "from 'drupal-twig-extensions/twig'"
const TWIG_JS_INJECT_AFTER = 'addDrupalExtensions(Twig);'
const TWING_MARKER = 'createSynchronousEnvironment'
const TWING_INJECT_AFTER = 'addDrupalExtensions(env);'
const INJECTED_GUARD = '_sdcRegisterRuntime'

export type WatchContext = Pick<Rollup.PluginContext, 'addWatchFile'>

// What the hooks use from Vite's HmrContext and ViteDevServer.
interface ReloadSender {
  send(payload: { type: 'full-reload' }): void
}
export interface HotUpdateContext {
  modules: ReadonlyArray<{ id: string | null }>
  server: { ws: ReloadSender }
}
export interface IconWatchServer {
  watcher: {
    add(path: string): void
    on(event: 'add', listener: (path: string) => void): void
  }
  moduleGraph: {
    getModuleById(id: string): { id: string | null } | undefined
    invalidateModule(mod: { id: string | null }): void
  }
  ws: ReloadSender
}

// Hooks as plain functions; `sdcTwigRuntimePlugin` wraps them.
export function createSdcTwigRuntimeHooks(
  namespaces: TwingNamespaceRoots,
  resolveIconSource?: ResolveIconSource
) {
  return {
    resolveId(id: string): string | undefined {
      if (id === VIRTUAL_TWIG) return RESOLVED_TWIG
      if (id === VIRTUAL_TWING) return RESOLVED_TWING
      if (id.startsWith(PACK_PREFIX)) return id
      return undefined
    },

    async load(this: WatchContext, id: string): Promise<string | undefined> {
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

        const sprites = await inlineRemoteIcons(packs, namespaces)

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
      return undefined
    },

    handleHotUpdate({
      modules,
      server,
    }: HotUpdateContext): ModuleNode[] | void {
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

    transform(code: string, id: string): { code: string; map: null } | null {
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

    configureServer(server: IconWatchServer): void {
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

export function sdcTwigRuntimePlugin(
  namespaces: TwingNamespaceRoots,
  resolveIconSource?: ResolveIconSource
): Plugin {
  return {
    name: 'vite-plugin-sdc-twig-runtime',
    ...createSdcTwigRuntimeHooks(namespaces, resolveIconSource),
  }
}
