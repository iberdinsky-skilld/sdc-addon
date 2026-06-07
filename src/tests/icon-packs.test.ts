import { describe, expect, test } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { toNamespaces } from '../namespaces.ts'
import { discoverIconPacks, loadIconPackFile } from '../icon-packs.ts'
import { iconPacksPlugin } from '../vite-plugin-sdc-icon-packs.ts'

// ── helpers ────────────────────────────────────────────────────────────────

function makeTmpNs(ns: string) {
  const tmpRoot = mkdtempSync(join(tmpdir(), `sdc-icons-${ns}-`))
  mkdirSync(join(tmpRoot, 'components'), { recursive: true })
  return {
    tmpRoot,
    cleanup: () => rmSync(tmpRoot, { recursive: true, force: true }),
  }
}

// ── discoverIconPacks ──────────────────────────────────────────────────────

describe('discoverIconPacks', () => {
  test('returns {} when no *.icons.yml exists', () => {
    const { tmpRoot, cleanup } = makeTmpNs('noicons')
    try {
      const ns = toNamespaces({
        namespace: '',
        namespaces: { noicons: tmpRoot },
      })
      expect(discoverIconPacks(ns)).toEqual({})
    } finally {
      cleanup()
    }
  })

  test('skips packs with enabled: false', () => {
    const { tmpRoot, cleanup } = makeTmpNs('entest')
    try {
      writeFileSync(
        join(tmpRoot, 'entest.icons.yml'),
        `
active:
  extractor: path
  template: ""
disabled:
  enabled: false
  extractor: path
  template: ""
`
      )
      const ns = toNamespaces({
        namespace: '',
        namespaces: { entest: tmpRoot },
      })
      const packs = discoverIconPacks(ns)
      expect(Object.keys(packs)).toEqual(['active'])
    } finally {
      cleanup()
    }
  })

  test('svg_sprite extractor: resolves sprite file URL, no per-icon data', () => {
    const { tmpRoot, cleanup } = makeTmpNs('sprite')
    try {
      writeFileSync(join(tmpRoot, 'sprite.svg'), '<svg></svg>')
      writeFileSync(
        join(tmpRoot, 'sprite.icons.yml'),
        `
sprite:
  label: "Sprite Pack"
  extractor: svg_sprite
  config:
    sources:
      - sprite.svg
  settings:
    size:
      type: string
      default: md
  template: "<svg>{{ content }}</svg>"
`
      )
      const ns = toNamespaces({
        namespace: '',
        namespaces: { sprite: tmpRoot },
      })
      const packs = discoverIconPacks(ns)
      const pack = packs['sprite']

      expect(pack.extractor).toBe('svg_sprite')
      expect(pack.label).toBe('Sprite Pack')
      expect(pack.sourceUrls[0]).toMatch(/^\/sdc-icons\//)
      expect(pack.sourceUrls[0]).toContain('sprite.svg')
      expect(pack.svgIcons).toEqual({})
      expect(pack.pathIcons).toEqual({})
      expect(pack.settings.size.default).toBe('md')
    } finally {
      cleanup()
    }
  })

  test('svg extractor: inlines inner SVG content and parses attributes', () => {
    const { tmpRoot, cleanup } = makeTmpNs('svgext')
    try {
      const iconsDir = join(tmpRoot, 'icons')
      mkdirSync(iconsDir)

      writeFileSync(
        join(iconsDir, 'star.svg'),
        '<svg viewBox="0 0 24 24" class="my-icon"><path d="M12 2"/></svg>'
      )
      writeFileSync(
        join(iconsDir, 'home.svg'),
        '<svg viewBox="0 0 16 16"><rect x="2" y="2" width="12"/></svg>'
      )

      writeFileSync(
        join(tmpRoot, 'svgext.icons.yml'),
        `
svgext:
  extractor: svg
  config:
    sources:
      - icons
  template: "<svg>{{ content }}</svg>"
`
      )
      const ns = toNamespaces({
        namespace: '',
        namespaces: { svgext: tmpRoot },
      })
      const packs = discoverIconPacks(ns)
      const pack = packs['svgext']

      expect(pack.extractor).toBe('svg')

      // star.svg: inner content (no <svg> wrapper) and attributes parsed
      const star = pack.svgIcons['star']
      expect(star).toBeDefined()
      expect(star.content).toBe('<path d="M12 2"/>')
      expect(star.attrs['viewBox']).toBe('0 0 24 24')
      expect(star.attrs['class']).toBe('my-icon')
      expect(star.sourceUrl).toMatch(/^\/sdc-icons\//)
      expect(star.group).toBe('')

      // home.svg
      const home = pack.svgIcons['home']
      expect(home.content).toContain('<rect')
      expect(home.attrs['viewBox']).toBe('0 0 16 16')
    } finally {
      cleanup()
    }
  })

  test('svg extractor with {group} subdirectory structure', () => {
    const { tmpRoot, cleanup } = makeTmpNs('grouped')
    try {
      const socialDir = join(tmpRoot, 'icons', 'social')
      const navDir = join(tmpRoot, 'icons', 'nav')
      mkdirSync(socialDir, { recursive: true })
      mkdirSync(navDir, { recursive: true })

      writeFileSync(join(socialDir, 'twitter.svg'), '<svg><path/></svg>')
      writeFileSync(join(navDir, 'home.svg'), '<svg><path/></svg>')

      writeFileSync(
        join(tmpRoot, 'grouped.icons.yml'),
        `
grouped:
  extractor: svg
  config:
    sources:
      - icons/{group}/*.svg
  template: "{{ content }}"
`
      )
      const ns = toNamespaces({
        namespace: '',
        namespaces: { grouped: tmpRoot },
      })
      const packs = discoverIconPacks(ns)
      const pack = packs['grouped']

      expect(pack.svgIcons['twitter']).toBeDefined()
      expect(pack.svgIcons['twitter'].group).toBe('social')
      expect(pack.svgIcons['home']).toBeDefined()
      expect(pack.svgIcons['home'].group).toBe('nav')
    } finally {
      cleanup()
    }
  })

  test('path extractor: discovers icons with source URLs', () => {
    const { tmpRoot, cleanup } = makeTmpNs('pathext')
    try {
      const imgDir = join(tmpRoot, 'img')
      mkdirSync(imgDir)
      writeFileSync(join(imgDir, 'arrow.png'), 'PNG')
      writeFileSync(join(imgDir, 'star.png'), 'PNG')

      writeFileSync(
        join(tmpRoot, 'pathext.icons.yml'),
        `
pathext:
  extractor: path
  config:
    sources:
      - img/*.png
  template: '<img src="{{ source }}">'
`
      )
      const ns = toNamespaces({
        namespace: '',
        namespaces: { pathext: tmpRoot },
      })
      const packs = discoverIconPacks(ns)
      const pack = packs['pathext']

      expect(pack.extractor).toBe('path')
      expect(pack.pathIcons['arrow']).toBeDefined()
      expect(pack.pathIcons['arrow'].sourceUrl).toMatch(/^\/sdc-icons\//)
      expect(pack.pathIcons['arrow'].sourceUrl).toContain('arrow.png')
      expect(pack.pathIcons['star']).toBeDefined()
    } finally {
      cleanup()
    }
  })

  test('skips malformed YAML without throwing', () => {
    const { tmpRoot, cleanup } = makeTmpNs('bad')
    try {
      writeFileSync(join(tmpRoot, 'bad.icons.yml'), ':: invalid yaml ::')
      const ns = toNamespaces({ namespace: '', namespaces: { bad: tmpRoot } })
      expect(() => discoverIconPacks(ns)).not.toThrow()
      expect(discoverIconPacks(ns)).toEqual({})
    } finally {
      cleanup()
    }
  })

  test('discovers packs from multiple namespaces', () => {
    const { tmpRoot: r1, cleanup: c1 } = makeTmpNs('ns1')
    const { tmpRoot: r2, cleanup: c2 } = makeTmpNs('ns2')
    try {
      writeFileSync(
        join(r1, 'ns1.icons.yml'),
        `ns1:\n  extractor: path\n  template: ""\n`
      )
      writeFileSync(
        join(r2, 'ns2.icons.yml'),
        `ns2:\n  extractor: path\n  template: ""\n`
      )
      const ns = toNamespaces({
        namespace: '',
        namespaces: { ns1: r1, ns2: r2 },
      })
      const packs = discoverIconPacks(ns)
      expect(Object.keys(packs)).toContain('ns1')
      expect(Object.keys(packs)).toContain('ns2')
    } finally {
      c1()
      c2()
    }
  })

  test('defaults extractor to svg when extractor field is omitted', () => {
    const { tmpRoot, cleanup } = makeTmpNs('defext')
    try {
      writeFileSync(
        join(tmpRoot, 'defext.icons.yml'),
        `defext:\n  template: ""\n`
      )
      const ns = toNamespaces({
        namespace: '',
        namespaces: { defext: tmpRoot },
      })
      expect(discoverIconPacks(ns)['defext'].extractor).toBe('svg')
    } finally {
      cleanup()
    }
  })
})

// ── loadIconPackFile ───────────────────────────────────────────────────────

describe('loadIconPackFile', () => {
  test('returns empty packs and watchFiles=[path] for non-existent file', () => {
    const result = loadIconPackFile('/nonexistent/path.icons.yml')
    expect(result.packs).toEqual({})
    expect(result.watchFiles).toEqual(['/nonexistent/path.icons.yml'])
  })

  test('returns empty packs for malformed YAML', () => {
    const { tmpRoot, cleanup } = makeTmpNs('lf-bad')
    try {
      writeFileSync(join(tmpRoot, 'lf-bad.icons.yml'), ':: invalid ::')
      const result = loadIconPackFile(join(tmpRoot, 'lf-bad.icons.yml'))
      expect(result.packs).toEqual({})
    } finally {
      cleanup()
    }
  })

  test('svg extractor: adds SVG files to watchFiles', () => {
    const { tmpRoot, cleanup } = makeTmpNs('lf-svg')
    try {
      const iconsDir = join(tmpRoot, 'icons')
      mkdirSync(iconsDir)
      writeFileSync(join(iconsDir, 'a.svg'), '<svg><path/></svg>')
      writeFileSync(join(iconsDir, 'b.svg'), '<svg><rect/></svg>')
      writeFileSync(
        join(tmpRoot, 'lf-svg.icons.yml'),
        `pack:\n  extractor: svg\n  config:\n    sources:\n      - icons\n  template: ""\n`
      )
      const { watchFiles } = loadIconPackFile(join(tmpRoot, 'lf-svg.icons.yml'))
      expect(watchFiles).toContain(join(tmpRoot, 'lf-svg.icons.yml'))
      expect(watchFiles).toContain(join(iconsDir, 'a.svg'))
      expect(watchFiles).toContain(join(iconsDir, 'b.svg'))
    } finally {
      cleanup()
    }
  })

  test('svg_sprite extractor: adds sprite file to watchFiles', () => {
    const { tmpRoot, cleanup } = makeTmpNs('lf-sprite')
    try {
      writeFileSync(join(tmpRoot, 'sprite.svg'), '<svg></svg>')
      writeFileSync(
        join(tmpRoot, 'lf-sprite.icons.yml'),
        `pack:\n  extractor: svg_sprite\n  config:\n    sources:\n      - sprite.svg\n  template: ""\n`
      )
      const { watchFiles } = loadIconPackFile(
        join(tmpRoot, 'lf-sprite.icons.yml')
      )
      expect(watchFiles).toContain(join(tmpRoot, 'sprite.svg'))
    } finally {
      cleanup()
    }
  })

  test('path extractor: does not add source files to watchFiles', () => {
    const { tmpRoot, cleanup } = makeTmpNs('lf-path')
    try {
      mkdirSync(join(tmpRoot, 'img'))
      writeFileSync(join(tmpRoot, 'img', 'arrow.png'), 'PNG')
      writeFileSync(
        join(tmpRoot, 'lf-path.icons.yml'),
        `pack:\n  extractor: path\n  config:\n    sources:\n      - img/*.png\n  template: ""\n`
      )
      const { watchFiles } = loadIconPackFile(
        join(tmpRoot, 'lf-path.icons.yml')
      )
      expect(watchFiles).toHaveLength(1)
      expect(watchFiles[0]).toContain('lf-path.icons.yml')
    } finally {
      cleanup()
    }
  })
})

// ── iconPacksPlugin virtual modules ────────────────────────────────────────

describe('iconPacksPlugin', () => {
  function makePlugin(ns: ReturnType<typeof toNamespaces>) {
    return iconPacksPlugin(ns) as any
  }

  test('resolves virtual module IDs including icons-pack prefix', () => {
    const { tmpRoot, cleanup } = makeTmpNs('vns')
    try {
      const ns = toNamespaces({ namespace: '', namespaces: { vns: tmpRoot } })
      const p = makePlugin(ns)
      expect(p.resolveId('virtual:sdc-icon-packs:twig')).toBe(
        '\0virtual:sdc-icon-packs:twig'
      )
      expect(p.resolveId('virtual:sdc-icon-packs:twing')).toBe(
        '\0virtual:sdc-icon-packs:twing'
      )
      expect(p.resolveId('\0icons-pack:/some/path.icons.yml')).toBe(
        '\0icons-pack:/some/path.icons.yml'
      )
      expect(p.resolveId('other')).toBeUndefined()
    } finally {
      cleanup()
    }
  })

  test('twig virtual module: imports from icons-pack modules, pack data in pack module', () => {
    const { tmpRoot, cleanup } = makeTmpNs('tvns')
    try {
      mkdirSync(join(tmpRoot, 'icons'))
      writeFileSync(
        join(tmpRoot, 'icons', 'star.svg'),
        '<svg viewBox="0 0 24 24"><path d="M12 2"/></svg>'
      )
      writeFileSync(
        join(tmpRoot, 'tvns.icons.yml'),
        `
tvns:
  extractor: svg
  config:
    sources:
      - icons
  settings:
    size:
      default: md
  template: "<svg>{{ content }}</svg>"
`
      )
      const ns = toNamespaces({ namespace: '', namespaces: { tvns: tmpRoot } })
      const p = makePlugin(ns)
      const mockThis = { addWatchFile: () => {} }
      const twigCode: string = p.load.call(
        mockThis,
        '\0virtual:sdc-icon-packs:twig'
      )

      expect(twigCode).toContain("from 'drupal-attribute'")
      expect(twigCode).toContain('Twig.extendFunction')
      expect(twigCode).toContain('registerIconFunction')
      expect(twigCode).toContain('\0icons-pack:')
      expect(twigCode).toContain('tvns')

      const packCode: string = p.load.call(
        mockThis,
        `\0icons-pack:${join(tmpRoot, 'tvns.icons.yml')}`
      )
      expect(packCode).toContain('tvns')
      expect(packCode).toContain('<path d=\\"M12 2\\"/>')
      expect(packCode).toContain('0 0 24 24')
    } finally {
      cleanup()
    }
  })

  test('twing virtual module: imports from icons-pack, uses setTemplate and env.render', () => {
    const { tmpRoot, cleanup } = makeTmpNs('tgvns')
    try {
      writeFileSync(
        join(tmpRoot, 'tgvns.icons.yml'),
        `tgvns:\n  extractor: path\n  template: ""\n`
      )
      const ns = toNamespaces({ namespace: '', namespaces: { tgvns: tmpRoot } })
      const p = makePlugin(ns)
      const mockThis = { addWatchFile: () => {} }
      const code: string = p.load.call(
        mockThis,
        '\0virtual:sdc-icon-packs:twing'
      )

      expect(code).toContain("from 'twing'")
      expect(code).toContain("from 'drupal-attribute'")
      expect(code).toContain('\0icons-pack:')
      expect(code).toContain('createSynchronousFunction')
      expect(code).toContain('registerIconFunction')
      expect(code).toContain('loader.setTemplate')
      expect(code).toContain("env.render('_sdc_icon_")
      expect(code).toContain('function(_twingCtx, packId, iconId, settings)')
    } finally {
      cleanup()
    }
  })

  test('transform injects twig.js icon registration', () => {
    const { tmpRoot, cleanup } = makeTmpNs('injt')
    try {
      const ns = toNamespaces({ namespace: '', namespaces: { injt: tmpRoot } })
      const p = makePlugin(ns)
      const fakeJs = `
import Twig from 'twig';
import { addDrupalExtensions } from 'drupal-twig-extensions/twig';
addDrupalExtensions(Twig);
export default (ctx) => Twig.render(ctx);
`
      const result = p.transform(fakeJs, 'comp.twig')
      expect(result).not.toBeNull()
      expect(result.code).toContain("from 'virtual:sdc-icon-packs:twig'")
      expect(result.code).toContain('_sdcRegisterIcon(Twig)')
    } finally {
      cleanup()
    }
  })

  test('transform injects twing icon registration', () => {
    const { tmpRoot, cleanup } = makeTmpNs('injtg')
    try {
      const ns = toNamespaces({ namespace: '', namespaces: { injtg: tmpRoot } })
      const p = makePlugin(ns)
      const fakeJs = `
import { createSynchronousEnvironment } from 'twing';
import { addDrupalExtensions } from '@christianwiedemann/drupal-twig-extensions/twing';
const env = createSynchronousEnvironment(loader);
addDrupalExtensions(env);
export default render;
`
      const result = p.transform(fakeJs, 'comp.twig')
      expect(result).not.toBeNull()
      expect(result.code).toContain("from 'virtual:sdc-icon-packs:twing'")
      expect(result.code).toContain('_sdcRegisterIcon(env)')
    } finally {
      cleanup()
    }
  })

  test('transform is idempotent', () => {
    const { tmpRoot, cleanup } = makeTmpNs('idem')
    try {
      const ns = toNamespaces({ namespace: '', namespaces: { idem: tmpRoot } })
      const p = makePlugin(ns)
      const alreadyInjected = `
import { registerIconFunction as _sdcRegisterIcon } from 'virtual:sdc-icon-packs:twig';
import { addDrupalExtensions } from 'drupal-twig-extensions/twig';
addDrupalExtensions(Twig);
_sdcRegisterIcon(Twig);
`
      expect(p.transform(alreadyInjected, 'comp.twig')).toBeNull()
    } finally {
      cleanup()
    }
  })

  test('transform returns null for non-twig files', () => {
    const { tmpRoot, cleanup } = makeTmpNs('nt')
    try {
      const ns = toNamespaces({ namespace: '', namespaces: { nt: tmpRoot } })
      const p = makePlugin(ns)
      expect(p.transform('export default {}', 'file.ts')).toBeNull()
      expect(p.transform('export default {}', 'file.css')).toBeNull()
    } finally {
      cleanup()
    }
  })

  describe('_sdcBuildIconContext settings resolution', () => {
    class MockDrupalAttribute {
      constructor(_entries: any) {}
    }

    const spritePack = {
      extractor: 'svg_sprite',
      sourceUrls: ['/sdc-icons/sprite.svg'],
      settings: { size: { default: 'md' }, color: { default: 'black' } },
      svgIcons: {},
      pathIcons: {},
    }

    function getBuildCtx() {
      const ns = toNamespaces({ namespace: '', namespaces: {} })
      const p = iconPacksPlugin(ns) as any
      const code: string = p.load.call(
        { addWatchFile: () => {} },
        '\0virtual:sdc-icon-packs:twig'
      )
      const match = code.match(
        /(function _sdcBuildIconContext[\s\S]+?)\nvar _sdcIconPacks/
      )
      if (!match) throw new Error('_sdcBuildIconContext not found in generated code')
      // eslint-disable-next-line no-new-func
      return new Function(match[1] + '\nreturn _sdcBuildIconContext;')()
    }

    test('plain object settings override defaults', () => {
      const buildCtx = getBuildCtx()
      const ctx = buildCtx(MockDrupalAttribute, spritePack, 'home', { size: 'lg' })
      expect(ctx.size).toBe('lg')
      expect(ctx.color).toBe('black')
    })

    test('Map settings are applied (Twing passes Map instead of plain object)', () => {
      const buildCtx = getBuildCtx()
      const ctx = buildCtx(
        MockDrupalAttribute,
        spritePack,
        'home',
        new Map([['size', 'xl'], ['color', 'blue']])
      )
      expect(ctx.size).toBe('xl')
      expect(ctx.color).toBe('blue')
    })

    test('partial Map uses defaults for missing keys', () => {
      const buildCtx = getBuildCtx()
      const ctx = buildCtx(
        MockDrupalAttribute,
        spritePack,
        'home',
        new Map([['size', 'xl']])
      )
      expect(ctx.size).toBe('xl')
      expect(ctx.color).toBe('black')
    })

    test('empty settings object uses all defaults', () => {
      const buildCtx = getBuildCtx()
      const ctx = buildCtx(MockDrupalAttribute, spritePack, 'home', {})
      expect(ctx.size).toBe('md')
      expect(ctx.color).toBe('black')
    })
  })

  test('_sdcBuildIconContext available in twig module with attributes and group', () => {
    const { tmpRoot, cleanup } = makeTmpNs('ctx')
    try {
      writeFileSync(
        join(tmpRoot, 'ctx.icons.yml'),
        `ctx:\n  extractor: svg_sprite\n  config:\n    sources:\n      - sprite.svg\n  template: ""\n`
      )
      const ns = toNamespaces({ namespace: '', namespaces: { ctx: tmpRoot } })
      const p = makePlugin(ns)
      const mockThis = { addWatchFile: () => {} }
      const code: string = p.load.call(
        mockThis,
        '\0virtual:sdc-icon-packs:twig'
      )

      expect(code).toContain('_sdcBuildIconContext')
      expect(code).toContain('attributes')
      expect(code).toContain('group')
      expect(code).toContain('new DrupalAttribute')
    } finally {
      cleanup()
    }
  })
})
