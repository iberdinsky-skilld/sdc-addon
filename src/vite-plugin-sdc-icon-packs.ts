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

const VIRTUAL_TWIG = 'virtual:sdc-icon-packs:twig'
const RESOLVED_TWIG = '\0' + VIRTUAL_TWIG

const VIRTUAL_TWING = 'virtual:sdc-icon-packs:twing'
const RESOLVED_TWING = '\0' + VIRTUAL_TWING

const PACK_PREFIX = '\0icons-pack:'

const SHARED_HELPERS = /* js */ `
function _sdcBuildIconContext(DrupalAttribute, pack, iconId, settings) {
  if (settings instanceof Map) settings = Object.fromEntries(settings);
  var resolved = {};
  var packSettings = pack.settings || {};
  var settingKeys = Object.keys(packSettings);
  for (var i = 0; i < settingKeys.length; i++) {
    var key = settingKeys[i];
    var def = packSettings[key];
    resolved[key] =
      settings && Object.prototype.hasOwnProperty.call(settings, key)
        ? settings[key]
        : def && def.default !== undefined
        ? def.default
        : '';
  }

  var source = '';
  var content = '';
  var svgAttrs = {};
  var group = '';

  if (pack.extractor === 'svg_sprite') {
    source = pack.sourceUrls && pack.sourceUrls[0] ? pack.sourceUrls[0] : '';
  } else if (pack.extractor === 'svg') {
    var svgData = pack.svgIcons && pack.svgIcons[iconId];
    if (svgData) {
      source = svgData.sourceUrl || '';
      content = svgData.content || '';
      svgAttrs = svgData.attrs || {};
      group = svgData.group || '';
    }
  } else {
    var pathData = pack.pathIcons && pack.pathIcons[iconId];
    if (pathData) {
      source = pathData.sourceUrl || '';
      group = pathData.group || '';
    } else if (pack.sourceUrls && pack.sourceUrls[0]) {
      var base = pack.sourceUrls[0];
      source =
        base.indexOf('{icon_id}') !== -1
          ? base.replace(/\{icon_id\}/g, iconId)
          : base + '/' + iconId;
    }
  }

  var attributes = new DrupalAttribute(Object.entries(svgAttrs));

  return Object.assign(
    { icon_id: iconId, source: source, content: content, attributes: attributes, group: group },
    resolved
  );
}
`

function packImports(paths: string[]): { imports: string; mergeExpr: string } {
  const imports = paths
    .map((p, i) => `import _p${i} from '${PACK_PREFIX}${p}';`)
    .join('\n')
  const args = paths.map((_, i) => `_p${i}`).join(', ')
  return { imports, mergeExpr: args ? `Object.assign({}, ${args})` : '{}' }
}

function generateTwigModule(packFilePaths: string[]): string {
  const { imports, mergeExpr } = packImports(packFilePaths)

  return `
import DrupalAttribute from 'drupal-attribute';
${imports}

${SHARED_HELPERS}

var _sdcIconPacks = ${mergeExpr};

export function registerIconFunction(Twig) {
  if (Twig.__sdcIconRegistered) return;
  Twig.__sdcIconRegistered = true;

  Twig.extendFunction('icon', function(packId, iconId, settings) {
    var pack = _sdcIconPacks[packId];
    if (!pack || !iconId) return '';
    var ctx = _sdcBuildIconContext(DrupalAttribute, pack, iconId, settings || {});
    try {
      var tmpl = Twig.twig({ data: pack.template });
      return tmpl.render(ctx);
    } catch (e) {
      console.error('[SDC Icons] Error rendering icon "' + packId + ':' + iconId + '":', e);
      return '';
    }
  });
}
`
}

function generateTwingModule(packFilePaths: string[]): string {
  const { imports, mergeExpr } = packImports(packFilePaths)

  return `
import { createSynchronousFunction } from 'twing';
import DrupalAttribute from 'drupal-attribute';
${imports}

${SHARED_HELPERS}

var _sdcIconPacks = ${mergeExpr};

export function registerIconFunction(env) {
  // Register icon templates into the existing loader so env.render() finds them.
  // createSynchronousArrayLoader (used by vite-plugin-twing-drupal's SDC loader)
  // stores templates by reference — setTemplate() propagates to both the wrapper
  // loader and the base array loader.
  var loader = env.loader;
  if (loader && typeof loader.setTemplate === 'function') {
    var packIds = Object.keys(_sdcIconPacks);
    for (var i = 0; i < packIds.length; i++) {
      loader.setTemplate('_sdc_icon_' + packIds[i], _sdcIconPacks[packIds[i]].template);
    }
  }

  var func = createSynchronousFunction(
    'icon',
    function(_twingCtx, packId, iconId, settings) {
      var pack = _sdcIconPacks[packId];
      if (!pack || !iconId) return '';
      var ctx = _sdcBuildIconContext(DrupalAttribute, pack, iconId, settings || {});
      try {
        return env.render('_sdc_icon_' + packId, ctx);
      } catch (e) {
        console.error('[SDC Icons] Error rendering icon "' + packId + ':' + iconId + '":', e);
        return '';
      }
    },
    [
      { name: 'pack_id' },
      { name: 'icon_id' },
      { name: 'settings', defaultValue: {} },
    ]
  );

  env.addFunction(func);
}
`
}

const TWIG_JS_MARKER = "from 'drupal-twig-extensions/twig'"
const TWIG_JS_INJECT_AFTER = 'addDrupalExtensions(Twig);'
const TWING_MARKER = 'createSynchronousEnvironment'
const TWING_INJECT_AFTER = 'addDrupalExtensions(env);'
const INJECTED_GUARD = '_sdcRegisterIcon'

export function iconPacksPlugin(
  namespaces: Namespaces,
  resolveIconSource?: ResolveIconSource
): Plugin {
  return {
    name: 'vite-plugin-sdc-icon-packs',

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
        return id === RESOLVED_TWIG
          ? generateTwigModule(packFilePaths)
          : generateTwingModule(packFilePaths)
      }

      if (id.startsWith(PACK_PREFIX)) {
        const filePath = id.slice(PACK_PREFIX.length)
        const { packs, watchFiles } = loadIconPackFile(filePath, resolveIconSource)
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

      if (code.includes(TWING_MARKER) && code.includes(TWING_INJECT_AFTER)) {
        return {
          code:
            `import { registerIconFunction as ${INJECTED_GUARD} } from '${VIRTUAL_TWING}';\n` +
            code.replace(
              TWING_INJECT_AFTER,
              `${TWING_INJECT_AFTER}\n${INJECTED_GUARD}(env);`
            ),
          map: null,
        }
      }

      if (
        code.includes(TWIG_JS_MARKER) &&
        code.includes(TWIG_JS_INJECT_AFTER)
      ) {
        return {
          code:
            `import { registerIconFunction as ${INJECTED_GUARD} } from '${VIRTUAL_TWIG}';\n` +
            code.replace(
              TWIG_JS_INJECT_AFTER,
              `${TWIG_JS_INJECT_AFTER}\n${INJECTED_GUARD}(Twig);`
            ),
          map: null,
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
