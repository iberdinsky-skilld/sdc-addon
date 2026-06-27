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

// ---------------------------------------------------------------------------
// "Render array" support (story library_wrapper).
//
// A *.story.yml library_wrapper may treat `_story` as a render array and merge
// #props/#slots into it, re-rendering in a loop, e.g.:
//   {{ color_story|merge({'#props': _story['#props']|merge({...})}) }}
// We model `_story` as a plain object shaped like the UI Patterns convention
// ({ '#component', '#props', '#slots' }) so native Twig map ops work, give it a
// non-enumerable toString() that renders #component, and override the `merge`
// filter so merging render arrays keeps producing printable render arrays.
//
// Shared between the twig.js and twing modules; each module supplies its own
// `_sdcRenderStory(story, base)` (referenced lazily from toString()).
const STORY_HELPERS = /* js */ `
var _sdcStoryBase = new WeakMap();

// Normalise any Twig/JS iterable-ish value to an array of [key, value] entries.
function _sdcEntries(value) {
  if (value == null) return [];
  if (value instanceof Map) return Array.from(value.entries());
  // DrupalAttribute (and other [key,value] iterables) — but not plain arrays/strings.
  if (
    typeof value === 'object' &&
    typeof value.addClass === 'function' &&
    typeof value[Symbol.iterator] === 'function'
  ) {
    return Array.from(value);
  }
  if (Array.isArray(value)) return value.map(function (v, i) { return [i, v]; });
  if (typeof value === 'object') return Object.entries(value);
  return [];
}

// Deep-convert Twing Maps to plain objects so they can be used as a render
// context. DrupalAttribute is a Map subclass but must be preserved as-is (it
// carries addClass()/toString() the templates rely on), so only convert plain
// Twing Maps.
function _sdcToPlain(value) {
  if (value instanceof Map && typeof value.addClass !== 'function') {
    var out = {};
    value.forEach(function (v, k) { out[k] = _sdcToPlain(v); });
    return out;
  }
  return value;
}

function _sdcIsStory(value) {
  if (value == null) return false;
  if (typeof value === 'object' && value.__sdcStory) return true;
  if (value instanceof Map) return value.has('#component');
  if (typeof value === 'object') {
    return Object.prototype.hasOwnProperty.call(value, '#component');
  }
  return false;
}

// Build a printable render-array object. \`_sdcRenderStory\` is module-specific
// (it renders through the active Twig/Twing environment) and defined below.
function _sdcMakeStoryObject(data, base) {
  var obj = {};
  var entries = _sdcEntries(data);
  for (var i = 0; i < entries.length; i++) obj[entries[i][0]] = entries[i][1];
  Object.defineProperty(obj, '__sdcStory', { value: true, enumerable: false });
  Object.defineProperty(obj, 'toString', {
    enumerable: false,
    value: function () {
      return _sdcRenderStory(obj, _sdcStoryBase.get(obj));
    },
  });
  if (base) _sdcStoryBase.set(obj, base);
  return obj;
}

// Public factory used by the story decorator.
export function makeStory(component, props, slots, base) {
  return _sdcMakeStoryObject(
    { '#component': component, '#props': props || {}, '#slots': slots || {} },
    base
  );
}

// Shallow-merge two operands (one of which is/has #component) into a fresh,
// printable render array — used to override the native \`merge\` filter so the
// printable wrapper survives merges (native merge returns a plain Map).
function _sdcMergeStory(a, b) {
  var data = {};
  var ea = _sdcEntries(a);
  for (var i = 0; i < ea.length; i++) data[ea[i][0]] = ea[i][1];
  var eb = _sdcEntries(b);
  for (var j = 0; j < eb.length; j++) data[eb[j][0]] = eb[j][1];
  var base = _sdcStoryBase.get(a) || _sdcStoryBase.get(b) || null;
  return _sdcMakeStoryObject(data, base);
}

// Resolve the render context for a render array: { ...#props, ...#slots } plus
// the base internal keys (componentMetadata, defaultAttributes) the component
// template may rely on.
function _sdcStoryContext(story, base) {
  var props = _sdcToPlain(story['#props']) || {};
  var slots = _sdcToPlain(story['#slots']) || {};
  return Object.assign({}, base && base.context, props, slots);
}

// ---------------------------------------------------------------------------
// Make DrupalAttribute tolerant of a scalar \`class\` (general Drupal behaviour).
//
// In Drupal/PHP, Attribute::addClass() casts the existing class to (array)
// before appending, so \`{'class': 'foo'}\` then \`.addClass('bar')\` works. The
// JS drupal-attribute lib only arrays the *new* value, not the *existing* one,
// so a scalar class (e.g. create_attribute({'class': 'modal-dialog'}) or an
// attributes map carrying a string class) crashes with "push is not a function".
//
// drupal-attribute is a single ESM singleton shared by create_attribute and the
// component render functions, so patching its prototype once fixes every path.
// ---------------------------------------------------------------------------
function _sdcPatchDrupalAttribute(AttrClass) {
  if (!AttrClass || !AttrClass.prototype || AttrClass.prototype.__sdcClassPatched) return;
  var proto = AttrClass.prototype;
  var normalize = function (self) {
    if (typeof self.get !== 'function') return;
    var existing = self.get('class');
    if (typeof existing === 'string') {
      self.set('class', existing === '' ? [] : [existing]);
    }
  };
  ['addClass', 'removeClass', 'hasClass'].forEach(function (name) {
    var orig = proto[name];
    if (typeof orig !== 'function') return;
    proto[name] = function () {
      normalize(this);
      return orig.apply(this, arguments);
    };
  });
  Object.defineProperty(proto, '__sdcClassPatched', { value: true, enumerable: false });
}
_sdcPatchDrupalAttribute(DrupalAttribute);
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
var _sdcTwig = null;

${STORY_HELPERS}

// Render an icon node (type: icon) the same way the icon() Twig function does.
export function renderIcon(packId, iconId, settings) {
  var pack = _sdcIconPacks[packId];
  if (!_sdcTwig || !pack || !iconId) return '';
  var ctx = _sdcBuildIconContext(DrupalAttribute, pack, iconId, settings || {});
  try {
    return _sdcTwig.twig({ data: pack.template }).render(ctx);
  } catch (e) {
    return '';
  }
}

// Render an inline Twig template string (e.g. a story library_wrapper) so
// {{ include(...) }} and other Twig works; {{ _story }} comes from context.
export function renderInline(template, context) {
  if (!_sdcTwig || !template) return template || '';
  try {
    return _sdcTwig.twig({ data: template }).render(context || {});
  } catch (e) {
    console.error('[SDC] renderInline error:', e);
    return template;
  }
}

// Render a render array (story) through the component's own render() function,
// which for Twig.js builds attributes from defaultAttributes and lets an
// explicit (create_attribute) attributes override it — exactly what we want.
function _sdcRenderStory(story, base) {
  var ctx = _sdcStoryContext(story, base);
  if (base && typeof base.render === 'function') {
    try { return base.render(ctx); } catch (e) {
      console.error('[SDC] render story "' + story['#component'] + '" error:', e);
    }
  }
  return '';
}

export function registerSdcRuntime(Twig) {
  _sdcTwig = Twig;
  // Override the \`merge\` filter so merging render arrays keeps a printable
  // render array; non-story operands delegate to the native merge.
  if (!Twig.__sdcMergeOverridden) {
    Twig.__sdcMergeOverridden = true;
    var _origMerge = Twig.filters && Twig.filters.merge;
    Twig.extendFilter('merge', function (value, params) {
      var other = params && params[0];
      if (_sdcIsStory(value) || _sdcIsStory(other)) return _sdcMergeStory(value, other);
      return _origMerge ? _origMerge.call(this, value, params) : value;
    });
  }
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
import { createSynchronousFunction, createSynchronousFilter } from 'twing';
import DrupalAttribute from 'drupal-attribute';
${imports}

${SHARED_HELPERS}

var _sdcIconPacks = ${mergeExpr};
var _sdcIconEnv = null;

${STORY_HELPERS}

// Render an icon node (type: icon) the same way the icon() Twig function does.
export function renderIcon(packId, iconId, settings) {
  var pack = _sdcIconPacks[packId];
  if (!_sdcIconEnv || !pack || !iconId) return '';
  var ctx = _sdcBuildIconContext(DrupalAttribute, pack, iconId, settings || {});
  try {
    return _sdcIconEnv.render('_sdc_icon_' + packId, ctx);
  } catch (e) {
    return '';
  }
}

// Render an inline Twig template string (e.g. a story library_wrapper) through
// the captured SDC environment, so {{ include(...) }} resolves against the same
// loader and Twig works; {{ _story }} comes from context.
var _sdcInlineNames = {};
var _sdcInlineSeq = 0;
export function renderInline(template, context) {
  if (!_sdcIconEnv || !template) return template || '';
  var loader = _sdcIconEnv.loader;
  if (!loader || typeof loader.setTemplate !== 'function') return template;
  var name = _sdcInlineNames[template];
  if (!name) {
    name = '_sdc_inline_' + (_sdcInlineSeq++);
    _sdcInlineNames[template] = name;
  }
  try {
    loader.setTemplate(name, template);
    return _sdcIconEnv.render(name, context || {});
  } catch (e) {
    console.error('[SDC] renderInline error:', e);
    return template;
  }
}

// Render a render array (story) through the captured SDC environment. Twing's
// component render() helper re-wraps \`attributes\` via Object.entries(), which
// silently drops a DrupalAttribute produced by create_attribute(), so we render
// by component id directly here and normalise attributes ourselves.
function _sdcRenderStory(story, base) {
  var id = story['#component'];
  var ctx = _sdcStoryContext(story, base);
  var attrs = ctx.attributes;
  if (!(attrs && typeof attrs.addClass === 'function')) {
    ctx.attributes = new DrupalAttribute(_sdcEntries(attrs));
  }
  if (_sdcIconEnv) {
    try {
      return _sdcIconEnv.render(id, ctx);
    } catch (e) {
      console.error('[SDC] render story "' + id + '" error:', e);
    }
  }
  // Fallback to the component's own render() function if the env is unavailable.
  if (base && typeof base.render === 'function') {
    try { return base.render(ctx); } catch (e2) { /* ignore */ }
  }
  return '';
}

export function registerSdcRuntime(env) {
  _sdcIconEnv = env;
  // Override the \`merge\` filter so merging render arrays (operands that are/have
  // #component) keeps a printable render array; everything else delegates to the
  // native merge so normal component templates are unaffected.
  if (!env.__sdcMergeOverridden && env.filters && typeof env.filters.get === 'function') {
    var _origMerge = env.filters.get('merge');
    if (_origMerge) {
      env.__sdcMergeOverridden = true;
      env.addFilter(
        createSynchronousFilter(
          'merge',
          function (_execCtx, a, b) {
            if (_sdcIsStory(a) || _sdcIsStory(b)) return _sdcMergeStory(a, b);
            return _origMerge.callable(_execCtx, a, b);
          },
          [{ name: 'source' }]
        )
      );
    }
  }
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
        return id === RESOLVED_TWIG
          ? generateTwigModule(packFilePaths)
          : generateTwingModule(packFilePaths)
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

      if (code.includes(TWING_MARKER) && code.includes(TWING_INJECT_AFTER)) {
        return {
          code:
            `import { registerSdcRuntime as ${INJECTED_GUARD} } from '${VIRTUAL_TWING}';\n` +
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
            `import { registerSdcRuntime as ${INJECTED_GUARD} } from '${VIRTUAL_TWIG}';\n` +
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
