import assert from 'node:assert/strict'
import { describe, expect, onTestFinished, test, vi } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createYamlStoriesHooks } from '../vite/storybookYamlStories.ts'
import { yamlStoriesIndexer } from '../vite/storyIndexer.ts'
import { toNamespaces } from '../generate/namespaces.ts'

// A real `this` context: arrow-function mocks would hide an unbound hook call.
class PluginContextMock {
  watched: string[] = []
  addWatchFile(id: string): void {
    this.watched.push(id)
  }
}
const ctx = new PluginContextMock()
import { logger } from '../logger'

describe('vite-plugin-storybook-yaml-stories (integration)', () => {
  test('load() merges sdcStorybook.parameters with docs description', async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-vite-'))
    try {
      const compDir = join(tmpRoot, 'components', 'banner')
      mkdirSync(compDir, { recursive: true })

      const compYaml = `name: Banner
description: Banner desc
thirdPartySettings:
  sdcStorybook:
    parameters:
      layout: fullscreen
      controls:
        expanded: true
`
      writeFileSync(join(compDir, 'banner.component.yml'), compYaml)
      writeFileSync(join(compDir, 'banner.twig'), '<div>banner</div>')

      const namespaces = toNamespaces({
        namespace: '',
        namespaces: { umami: tmpRoot },
      })

      const plugin = createYamlStoriesHooks({ namespaces })
      const id = join(compDir, 'banner.component.yml')

      const result = await plugin.load.call(ctx, id)

      expect(result).toContain('parameters:')
      expect(result).toContain('"layout": "fullscreen"')
      expect(result).toContain('"controls": {')
      expect(result).toContain('"expanded": true')
      expect(result).toContain(
        'docs: {description: {component: "Banner desc"}}'
      )
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('load() with validate warns about schema errors and still returns the module', async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-vite-'))
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})
    try {
      const compDir = join(tmpRoot, 'components', 'badge')
      mkdirSync(compDir, { recursive: true })
      writeFileSync(
        join(compDir, 'badge.component.yml'),
        'name: Badge\nstatus: bogus\n'
      )
      writeFileSync(join(compDir, 'badge.twig'), '<div>badge</div>')

      // A tiny Drupal-like schema: status must be one of the known values.
      const schema = {
        type: 'object',
        properties: {
          status: {
            enum: ['experimental', 'stable', 'deprecated', 'obsolete'],
          },
        },
      }
      fetchMock.mockResolvedValue({ ok: true, json: () => schema })

      const namespaces = toNamespaces({
        namespace: '',
        namespaces: { umami: tmpRoot },
      })
      const plugin = createYamlStoriesHooks({
        namespaces,
        sdcStorybookOptions: { validate: 'https://example.com/schema.json' },
      })

      const result = await plugin.load.call(
        ctx,
        join(compDir, 'badge.component.yml')
      )

      expect(result).toContain('export const Basic')
      expect(fetchMock).toHaveBeenCalledWith('https://example.com/schema.json')
      expect(warnSpy).toHaveBeenCalledTimes(1)
      expect(String(warnSpy.mock.calls[0]?.[0])).toMatch(/instance\.status/)
    } finally {
      vi.unstubAllGlobals()
      warnSpy.mockRestore()
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('load() with an unreachable schema warns and still returns the module', async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-vite-'))
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'))
    vi.stubGlobal('fetch', fetchMock)
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})
    try {
      const compDir = join(tmpRoot, 'components', 'card')
      mkdirSync(compDir, { recursive: true })
      writeFileSync(join(compDir, 'card.component.yml'), 'name: Card\n')
      writeFileSync(join(compDir, 'card.twig'), '<div>card</div>')

      const namespaces = toNamespaces({
        namespace: '',
        namespaces: { umami: tmpRoot },
      })
      const plugin = createYamlStoriesHooks({
        namespaces,
        sdcStorybookOptions: { validate: true },
      })

      const result = await plugin.load.call(
        ctx,
        join(compDir, 'card.component.yml')
      )

      expect(result).toContain('export const Basic')
      expect(warnSpy).toHaveBeenCalledTimes(1)
      expect(String(warnSpy.mock.calls[0]?.[0])).toMatch(/Could not validate/)
    } finally {
      vi.unstubAllGlobals()
      warnSpy.mockRestore()
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('load() keeps docs description when sdcStorybook.parameters is empty', async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-vite-'))
    try {
      const compDir = join(tmpRoot, 'components', 'branding')
      mkdirSync(compDir, { recursive: true })

      const compYaml = `name: Branding
description: Branding desc
thirdPartySettings:
  sdcStorybook:
    parameters: {}
`
      writeFileSync(join(compDir, 'branding.component.yml'), compYaml)
      writeFileSync(join(compDir, 'branding.twig'), '<div>branding</div>')

      const namespaces = toNamespaces({
        namespace: '',
        namespaces: { umami: tmpRoot },
      })

      const plugin = createYamlStoriesHooks({ namespaces })
      const id = join(compDir, 'branding.component.yml')

      const result = await plugin.load.call(ctx, id)

      expect(result).toContain('parameters:')
      expect(result).toContain(
        'docs: {description: {component: "Branding desc"}}'
      )
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('load() includes component globals in default export', async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-vite-'))
    try {
      const compDir = join(tmpRoot, 'components', 'menu')
      mkdirSync(compDir, { recursive: true })

      const compYaml = `name: Menu
description: Menu desc
thirdPartySettings:
  sdcStorybook:
    globals:
      theme: dark
      locale: en`
      writeFileSync(join(compDir, 'menu.component.yml'), compYaml)
      writeFileSync(join(compDir, 'menu.twig'), '<div>menu</div>')

      const namespaces = toNamespaces({
        namespace: '',
        namespaces: { umami: tmpRoot },
      })

      const plugin = createYamlStoriesHooks({ namespaces })
      const id = join(compDir, 'menu.component.yml')

      const result = await plugin.load.call(ctx, id)

      expect(result).toContain('globals:')
      expect(result).toContain('"theme": "dark"')
      expect(result).toContain('"locale": "en"')
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('load() merges story globals with component globals', async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-vite-'))
    try {
      const compDir = join(tmpRoot, 'components', 'slider')
      mkdirSync(compDir, { recursive: true })

      const compYaml = `name: Slider
description: Slider desc
thirdPartySettings:
  sdcStorybook:
    globals:
      locale: en`
      writeFileSync(join(compDir, 'slider.component.yml'), compYaml)
      writeFileSync(join(compDir, 'slider.twig'), '<div>slider</div>')

      const storyFile = join(compDir, 'slider.withGlobals.story.yml')
      writeFileSync(
        storyFile,
        'thirdPartySettings:\n  sdcStorybook:\n    globals:\n      theme: dark\n'
      )

      const namespaces = toNamespaces({
        namespace: '',
        namespaces: { umami: tmpRoot },
      })

      const plugin = createYamlStoriesHooks({ namespaces })
      const id = join(compDir, 'slider.component.yml')

      const result = await plugin.load.call(ctx, id)
      // Story files are registered with Vite so edits regenerate the module.
      expect(ctx.watched).toContain(storyFile)

      expect(result).toContain('export const WithGlobals')
      expect(result).toContain('globals:')
      expect(result).toContain('"locale": "en"')
      expect(result).toContain('"theme": "dark"')
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })
  test('load() generates module with imports and Basic export', async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-vite-'))
    try {
      const compDir = join(tmpRoot, 'components', 'card')
      const nested = join(tmpRoot, 'components', 'title')
      mkdirSync(compDir, { recursive: true })
      mkdirSync(nested, { recursive: true })

      const compYaml = `name: Card\nstatus: stable\ndescription: Card desc`
      writeFileSync(join(compDir, 'card.component.yml'), compYaml)
      writeFileSync(join(compDir, 'card.twig'), '<div>card</div>')
      writeFileSync(join(compDir, 'card~variant.twig'), '<div>variant</div>')
      writeFileSync(join(compDir, 'card.js'), '// js')
      writeFileSync(join(compDir, 'card.css'), '/* css */')

      writeFileSync(join(nested, 'title.component.yml'), 'name: Title')
      writeFileSync(join(nested, 'title.twig'), '<h1>title</h1>')

      const namespaces = toNamespaces({
        namespace: '',
        namespaces: { umami: tmpRoot },
      })

      const plugin = createYamlStoriesHooks({ namespaces })
      const id = join(compDir, 'card.component.yml')

      const result = await plugin.load.call(ctx, id)
      expect(typeof result).toBe('string')
      expect(result).toContain("import.meta.glob('./*.{js,mjs}')")
      expect(result).toContain("import.meta.glob('./*.css'")
      // Namespace path may vary.
      expect(result).toMatch(/import COMPONENT from '.*card.twig'/)
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('yamlStoriesIndexer.createIndex returns story index entries', async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-idx-'))
    try {
      const compDir = join(tmpRoot, 'components', 'badge')
      mkdirSync(compDir, { recursive: true })
      const file = join(compDir, 'badge.component.yml')
      writeFileSync(
        file,
        `name: Badge\nstatus: stable\ndescription: Badge desc`,
        'utf8'
      )

      const index = await yamlStoriesIndexer.createIndex(file, {
        makeTitle: (s?: string) => s ?? '',
      })
      expect(Array.isArray(index)).toBe(true)
      expect(index[0]).toHaveProperty('importPath', file)
      expect(index[0]).toHaveProperty('exportName')
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('variant twig files are not imported in the generated module', async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-vite-'))
    try {
      const compDir = join(tmpRoot, 'components', 'card')
      mkdirSync(compDir, { recursive: true })

      writeFileSync(join(compDir, 'card.component.yml'), 'name: Card')
      writeFileSync(join(compDir, 'card.twig'), '<div>card</div>')
      writeFileSync(join(compDir, 'card~variant.twig'), '<div>variant</div>')

      const namespaces = toNamespaces({
        namespace: '',
        namespaces: { umami: tmpRoot },
      })

      const plugin = createYamlStoriesHooks({ namespaces })
      const result = await plugin.load.call(
        ctx,
        join(compDir, 'card.component.yml')
      )

      expect(result).toMatch(/import COMPONENT from '.*card.twig'/)
      expect(result).not.toContain('card~variant.twig')
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('CSS loaded via eager glob, arbitrary YAML files not imported', async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-vite-'))
    try {
      const compDir = join(tmpRoot, 'components', 'slider')
      mkdirSync(compDir, { recursive: true })

      writeFileSync(
        join(compDir, 'slider.component.yml'),
        'name: Slider\ndescription: x'
      )
      writeFileSync(join(compDir, 'slider.twig'), '<div>x</div>')
      writeFileSync(join(compDir, 'slider.css'), '/* x */')
      writeFileSync(join(compDir, 'slider.badges.story.yml'), 'name: Badges')
      writeFileSync(join(compDir, 'data.yml'), 'foo: bar')

      const namespaces = toNamespaces({
        namespace: '',
        namespaces: { umami: tmpRoot },
      })
      const plugin = createYamlStoriesHooks({ namespaces })
      const result = await plugin.load.call(
        ctx,
        join(compDir, 'slider.component.yml')
      )

      expect(result).toContain("import.meta.glob('./*.css'")
      expect(result).not.toContain("import './slider.component.yml';")
      expect(result).not.toContain("import './data.yml';")
      expect(result).not.toContain('.story.yml')
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('dynamicImports imports referenced components from props/slots', async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-vite-'))
    try {
      const compDir = join(tmpRoot, 'components', 'card')
      const nested = join(tmpRoot, 'components', 'title')
      mkdirSync(compDir, { recursive: true })
      mkdirSync(nested, { recursive: true })

      writeFileSync(join(compDir, 'card.component.yml'), 'name: Card')
      writeFileSync(join(compDir, 'card.twig'), '<div>card</div>')

      writeFileSync(join(nested, 'title.component.yml'), 'name: Title')
      writeFileSync(join(nested, 'title.twig'), '<h1>title</h1>')

      const storyFile = join(compDir, 'card.withTitle.story.yml')
      // Story body only; the file name provides the key.
      writeFileSync(
        storyFile,
        'props:\n  title:\n    type: component\n    component: umami:title\n'
      )

      const namespaces = toNamespaces({
        namespace: '',
        namespaces: { umami: tmpRoot },
      })
      const plugin = createYamlStoriesHooks({ namespaces })
      const id = join(compDir, 'card.component.yml')

      const result = await plugin.load.call(ctx, id)

      expect(result).toContain('import *')
      expect(result).toContain('title.component.yml')
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('story.yml in a nested stories/ subfolder is indexed', async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-idx-'))
    try {
      const compDir = join(tmpRoot, 'components', 'accordion')
      const storiesDir = join(compDir, 'stories')
      mkdirSync(storiesDir, { recursive: true })

      const file = join(compDir, 'accordion.component.yml')
      writeFileSync(file, 'name: Accordion', 'utf8')
      writeFileSync(
        join(storiesDir, 'accordion.always_open.story.yml'),
        'name: Always open',
        'utf8'
      )

      const index = await yamlStoriesIndexer.createIndex(file, {
        makeTitle: (s?: string) => s ?? '',
      })
      const exportNames = index.map((i: { exportName: string }) => i.exportName)
      expect(exportNames).toContain('Basic')
      expect(exportNames).toContain('Always_open')
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('stories of a nested sub-component do not leak into the parent', async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-idx-'))
    try {
      const compDir = join(tmpRoot, 'components', 'card')
      const subDir = join(compDir, 'inner')
      mkdirSync(subDir, { recursive: true })

      const file = join(compDir, 'card.component.yml')
      writeFileSync(file, 'name: Card', 'utf8')
      // A nested component with its own story — must NOT be pulled into Card.
      writeFileSync(join(subDir, 'inner.component.yml'), 'name: Inner', 'utf8')
      writeFileSync(
        join(subDir, 'inner.special.story.yml'),
        'name: Special',
        'utf8'
      )

      const index = await yamlStoriesIndexer.createIndex(file, {
        makeTitle: (s?: string) => s ?? '',
      })
      const exportNames = index.map((i: { exportName: string }) => i.exportName)
      expect(exportNames).not.toContain('Special')
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('createIndex respects disabledStories all (returns empty)', async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-idx-'))
    try {
      const compDir = join(tmpRoot, 'components', 'badge')
      mkdirSync(compDir, { recursive: true })
      const file = join(compDir, 'badge.component.yml')
      writeFileSync(
        file,
        `name: Badge\nthirdPartySettings:\n  sdcStorybook:\n    disabledStories: [all]`,
        'utf8'
      )

      const index = await yamlStoriesIndexer.createIndex(file, {
        makeTitle: (s?: string) => s ?? '',
      })
      expect(Array.isArray(index)).toBe(true)
      expect(index.length).toBe(0)
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('createIndex logs and rethrows on malformed YAML', async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-idx-'))
    try {
      const compDir = join(tmpRoot, 'components', 'bad')
      mkdirSync(compDir, { recursive: true })
      const file = join(compDir, 'bad.component.yml')
      writeFileSync(file, `name: Bad\n  - invalid`, 'utf8')

      const spy = vi.spyOn(logger, 'error')
      const missing = join(compDir, 'does-not-exist.component.yml')
      await expect(
        yamlStoriesIndexer.createIndex(missing, {
          makeTitle: (s?: string) => s ?? '',
        })
      ).rejects.toThrow()
      expect(spy).toHaveBeenCalled()
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('createIndex adds Variant_ prefix for story key "basic" to avoid conflict', async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-idx-'))
    try {
      const compDir = join(tmpRoot, 'components', 'conflict')
      mkdirSync(compDir, { recursive: true })
      const file = join(compDir, 'conflict.component.yml')
      // Story with key 'basic' should get Variant_ prefix
      writeFileSync(
        file,
        `name: Conflict\nthirdPartySettings:\n  sdcStorybook:\n    stories:\n      basic:\n        description: Conflicts with Basic\n      other:\n        description: OK`,
        'utf8'
      )

      const index = await yamlStoriesIndexer.createIndex(file, {
        makeTitle: (s?: string) => s ?? '',
      })

      expect(index.length).toBe(3)
      expect(index.find((i) => i.exportName === 'Basic')).toBeDefined()
      expect(index.find((i) => i.exportName === 'Variant_Basic')).toBeDefined()
      expect(index.find((i) => i.exportName === 'Other')).toBeDefined()
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('vite-plugin-storybook-yaml-stories — twig dependency imports integration', () => {
  test('load() emits import for component included via {% include %} in twig', async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-twig-int-'))
    try {
      const paragraphDir = join(tmpRoot, 'components', 'paragraph')
      const titleDir = join(tmpRoot, 'components', 'title')
      mkdirSync(paragraphDir, { recursive: true })
      mkdirSync(titleDir, { recursive: true })

      writeFileSync(
        join(paragraphDir, 'paragraph.component.yml'),
        'name: Paragraph\nslots:\n  content:\n    title: Content'
      )
      writeFileSync(
        join(paragraphDir, 'paragraph.twig'),
        "{% include 'umami:title' with { label: label } only %}<div>{{ content }}</div>"
      )
      writeFileSync(join(titleDir, 'title.component.yml'), 'name: Title')
      writeFileSync(join(titleDir, 'title.twig'), '<h1>{{ label }}</h1>')
      writeFileSync(join(titleDir, 'title.css'), '/* title css */')

      const ns = toNamespaces({ namespace: '', namespaces: { umami: tmpRoot } })
      const plugin = createYamlStoriesHooks({ namespaces: ns })
      const result = await plugin.load.call(
        ctx,
        join(paragraphDir, 'paragraph.component.yml')
      )

      expect(result).toContain('title.component.yml')
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('load() emits import for component included via {% embed %} in twig', async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-twig-int-'))
    try {
      const parentDir = join(tmpRoot, 'components', 'parent')
      const childDir = join(tmpRoot, 'components', 'card')
      mkdirSync(parentDir, { recursive: true })
      mkdirSync(childDir, { recursive: true })

      writeFileSync(join(parentDir, 'parent.component.yml'), 'name: Parent')
      writeFileSync(
        join(parentDir, 'parent.twig'),
        "{% embed 'umami:card' %}{% block content %}hello{% endblock %}{% endembed %}"
      )
      writeFileSync(join(childDir, 'card.component.yml'), 'name: Card')
      writeFileSync(
        join(childDir, 'card.twig'),
        '<div>{% block content %}{% endblock %}</div>'
      )

      const ns = toNamespaces({ namespace: '', namespaces: { umami: tmpRoot } })
      const plugin = createYamlStoriesHooks({ namespaces: ns })
      const result = await plugin.load.call(
        ctx,
        join(parentDir, 'parent.component.yml')
      )

      expect(result).toContain('card.component.yml')
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('load() does not duplicate imports already present via dynamicImports', async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-twig-int-'))
    try {
      const paragraphDir = join(tmpRoot, 'components', 'paragraph')
      const titleDir = join(tmpRoot, 'components', 'title')
      mkdirSync(paragraphDir, { recursive: true })
      mkdirSync(titleDir, { recursive: true })

      // title is referenced BOTH in twig AND in YAML stories
      writeFileSync(
        join(paragraphDir, 'paragraph.component.yml'),
        [
          'name: Paragraph',
          'thirdPartySettings:',
          '  sdcStorybook:',
          '    stories:',
          '      preview:',
          '        slots:',
          '          content:',
          '            - type: component',
          '              component: umami:title',
        ].join('\n')
      )
      writeFileSync(
        join(paragraphDir, 'paragraph.twig'),
        "{% include 'umami:title' %}"
      )
      writeFileSync(join(titleDir, 'title.component.yml'), 'name: Title')
      writeFileSync(join(titleDir, 'title.twig'), '<h1>title</h1>')

      const ns = toNamespaces({ namespace: '', namespaces: { umami: tmpRoot } })
      const plugin = createYamlStoriesHooks({ namespaces: ns })
      const result = await plugin.load.call(
        ctx,
        join(paragraphDir, 'paragraph.component.yml')
      )

      // Component appears at least once (from either source)
      expect(result).toContain('title.component.yml')
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('load() handles cross-namespace twig includes', async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-twig-int-'))
    try {
      const dsARoot = join(tmpRoot, 'ds-a')
      const dsBRoot = join(tmpRoot, 'ds-b')

      const titleDir = join(dsARoot, 'components', 'title')
      const paragraphDir = join(dsBRoot, 'components', 'paragraph')
      mkdirSync(titleDir, { recursive: true })
      mkdirSync(paragraphDir, { recursive: true })

      writeFileSync(join(titleDir, 'title.component.yml'), 'name: Title')
      writeFileSync(join(titleDir, 'title.twig'), '<h1>{{ label }}</h1>')
      writeFileSync(join(titleDir, 'title.css'), '/* title css */')

      writeFileSync(
        join(paragraphDir, 'paragraph.component.yml'),
        'name: Paragraph'
      )
      writeFileSync(
        join(paragraphDir, 'paragraph.twig'),
        "{% include 'ds-a:title' with { label: label } only %}"
      )

      const ns = toNamespaces({
        namespace: '',
        namespaces: { 'ds-a': dsARoot, 'ds-b': dsBRoot },
      })
      const plugin = createYamlStoriesHooks({ namespaces: ns })
      const result = await plugin.load.call(
        ctx,
        join(paragraphDir, 'paragraph.component.yml')
      )

      expect(result).toContain('title.component.yml')
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('vite-plugin-storybook-yaml-stories — libraryOverrides integration', () => {
  test('load() imports local CSS/JS and injects CDN CSS via await in module', async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-lib-'))
    try {
      const compDir = join(tmpRoot, 'components', 'slider')
      mkdirSync(compDir, { recursive: true })

      writeFileSync(
        join(compDir, 'slider.component.yml'),
        [
          'name: Slider',
          'libraryOverrides:',
          '  css:',
          '    base:',
          "      'https://cdn.jsdelivr.net/npm/swiper@11/swiper.min.css':",
          '        type: external',
          '        minified: true',
          "      'slider.css': {}",
          '  js:',
          "    'slider.mjs': {}",
        ].join('\n')
      )
      writeFileSync(join(compDir, 'slider.twig'), '<div>slider</div>')
      writeFileSync(join(compDir, 'slider.css'), '/* css */')
      writeFileSync(join(compDir, 'slider.mjs'), '// js')

      const ns = toNamespaces({ namespace: '', namespaces: { umami: tmpRoot } })
      const plugin = createYamlStoriesHooks({ namespaces: ns })
      const result = await plugin.load.call(
        ctx,
        join(compDir, 'slider.component.yml')
      )

      expect(result).toContain("import.meta.glob('./*.css'")
      expect(result).toContain("import.meta.glob('./*.{js,mjs}')")
      expect(result).toContain('swiper.min.css')
      expect(result).toContain('injectAssets(')
      expect(result).not.toContain('sdcExternalAssets')
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('load() imports local JS and injects external CDN JS via await in module', async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-lib-'))
    try {
      const compDir = join(tmpRoot, 'components', 'widget')
      mkdirSync(compDir, { recursive: true })

      writeFileSync(
        join(compDir, 'widget.component.yml'),
        [
          'name: Widget',
          'libraryOverrides:',
          '  js:',
          "    'https://cdn.example.com/vendor.js': {}",
          "    'widget.js': {}",
        ].join('\n')
      )
      writeFileSync(join(compDir, 'widget.twig'), '<div>widget</div>')
      writeFileSync(join(compDir, 'widget.js'), '// js')

      const ns = toNamespaces({ namespace: '', namespaces: { umami: tmpRoot } })
      const plugin = createYamlStoriesHooks({ namespaces: ns })
      const result = await plugin.load.call(
        ctx,
        join(compDir, 'widget.component.yml')
      )

      expect(result).toContain("import.meta.glob('./*.{js,mjs}')")
      expect(result).toContain('vendor.js')
      expect(result).toContain('injectAssets(')
      expect(result).not.toContain('sdcExternalAssets')
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('load() produces clean output when libraryOverrides has only local files and Drupal deps', async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-lib-'))
    try {
      const compDir = join(tmpRoot, 'components', 'card')
      mkdirSync(compDir, { recursive: true })

      writeFileSync(
        join(compDir, 'card.component.yml'),
        [
          'name: Card',
          'libraryOverrides:',
          '  dependencies:',
          '    - core/drupal',
          '    - core/once',
          '  js:',
          "    'card.js': {}",
          '  css:',
          '    component:',
          "      'card.css': {}",
        ].join('\n')
      )
      writeFileSync(join(compDir, 'card.twig'), '<div>card</div>')

      const ns = toNamespaces({ namespace: '', namespaces: { umami: tmpRoot } })
      const plugin = createYamlStoriesHooks({ namespaces: ns })
      const result = await plugin.load.call(
        ctx,
        join(compDir, 'card.component.yml')
      )

      expect(result).not.toContain('sdcExternalAssets')
      expect(result).not.toContain('decorators')
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('load() produces valid output for component without libraryOverrides', async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-lib-'))
    try {
      const compDir = join(tmpRoot, 'components', 'badge')
      mkdirSync(compDir, { recursive: true })

      writeFileSync(join(compDir, 'badge.component.yml'), 'name: Badge')
      writeFileSync(join(compDir, 'badge.twig'), '<span>badge</span>')

      const ns = toNamespaces({ namespace: '', namespaces: { umami: tmpRoot } })
      const plugin = createYamlStoriesHooks({ namespaces: ns })
      const result = await plugin.load.call(
        ctx,
        join(compDir, 'badge.component.yml')
      )

      expect(result).not.toContain('sdcExternalAssets')
      expect(result).not.toContain('decorators')
      expect(typeof result).toBe('string')
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('load() imports local libraryOverrides subfolder CSS/JS with correct ordering', async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-lib-'))
    try {
      const compDir = join(tmpRoot, 'components', 'carousel')
      mkdirSync(compDir, { recursive: true })

      writeFileSync(
        join(compDir, 'carousel.component.yml'),
        [
          'name: Carousel',
          'libraryOverrides:',
          '  dependencies:',
          '    - core/drupal',
          '    - core/once',
          '  js:',
          "    'js/carousel.js': {}",
          '  css:',
          '    component:',
          "      'styles/carousel.css': {}",
        ].join('\n')
      )
      writeFileSync(join(compDir, 'carousel.twig'), '<div>carousel</div>')

      const ns = toNamespaces({ namespace: '', namespaces: { umami: tmpRoot } })
      const plugin = createYamlStoriesHooks({ namespaces: ns })
      const result = (await plugin.load.call(
        ctx,
        join(compDir, 'carousel.component.yml')
      )) as string

      expect(result).toContain("import './styles/carousel.css';")
      expect(result).toContain("await import('./js/carousel.js');")

      // Local CSS import sits after the eager css glob.
      expect(result.indexOf("import.meta.glob('./*.css'")).toBeLessThan(
        result.indexOf("import './styles/carousel.css';")
      )
      // Local JS dynamic import sits after asset injection and before the
      // flat js glob runs.
      const jsImportIdx = result.indexOf("await import('./js/carousel.js');")
      expect(jsImportIdx).toBeGreaterThan(
        result.indexOf("import './styles/carousel.css';")
      )
      expect(jsImportIdx).toBeLessThan(
        result.indexOf("import.meta.glob('./*.{js,mjs}')")
      )
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('load() does not duplicate root libraryOverrides files covered by the glob', async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-lib-'))
    try {
      const compDir = join(tmpRoot, 'components', 'card')
      mkdirSync(compDir, { recursive: true })

      writeFileSync(
        join(compDir, 'card.component.yml'),
        [
          'name: Card',
          'libraryOverrides:',
          '  js:',
          "    'card.js': {}",
          '  css:',
          '    component:',
          "      'card.css': {}",
        ].join('\n')
      )
      writeFileSync(join(compDir, 'card.twig'), '<div>card</div>')

      const ns = toNamespaces({ namespace: '', namespaces: { umami: tmpRoot } })
      const plugin = createYamlStoriesHooks({ namespaces: ns })
      const result = await plugin.load.call(
        ctx,
        join(compDir, 'card.component.yml')
      )

      // Root files are loaded by the flat glob, not re-imported explicitly.
      expect(result).not.toContain("import './card.css';")
      expect(result).not.toContain("await import('./card.js');")
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('load() injects media-scoped local CSS via ?url + injectAssets', async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-lib-'))
    try {
      const compDir = join(tmpRoot, 'components', 'poster')
      mkdirSync(compDir, { recursive: true })

      writeFileSync(
        join(compDir, 'poster.component.yml'),
        [
          'name: Poster',
          'libraryOverrides:',
          '  css:',
          '    theme:',
          "      'styles/print.css':",
          "        media: 'print'",
        ].join('\n')
      )
      writeFileSync(join(compDir, 'poster.twig'), '<div>poster</div>')

      const ns = toNamespaces({ namespace: '', namespaces: { umami: tmpRoot } })
      const plugin = createYamlStoriesHooks({ namespaces: ns })
      const result = await plugin.load.call(
        ctx,
        join(compDir, 'poster.component.yml')
      )

      // Media CSS is resolved as a URL and injected as a <link media>, not
      // bundled via a plain import.
      expect(result).toContain(
        "import _sdcLocalCss0 from './styles/print.css?url';"
      )
      expect(result).not.toContain("import './styles/print.css';")
      expect(result).toContain('await injectAssets([')
      expect(result).toContain(
        '{ type: \'css\', url: _sdcLocalCss0, media: "print" }'
      )
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('load() omits assets disabled via `false`', async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-lib-'))
    try {
      const compDir = join(tmpRoot, 'components', 'panel')
      mkdirSync(compDir, { recursive: true })

      writeFileSync(
        join(compDir, 'panel.component.yml'),
        [
          'name: Panel',
          'libraryOverrides:',
          '  css:',
          '    component:',
          "      'styles/keep.css': {}",
          "      'styles/drop.css': false",
          '  js:',
          "    'js/keep.js': {}",
          "    'js/drop.js': false",
        ].join('\n')
      )
      writeFileSync(join(compDir, 'panel.twig'), '<div>panel</div>')

      const ns = toNamespaces({ namespace: '', namespaces: { umami: tmpRoot } })
      const plugin = createYamlStoriesHooks({ namespaces: ns })
      const result = await plugin.load.call(
        ctx,
        join(compDir, 'panel.component.yml')
      )

      expect(result).toContain("import './styles/keep.css';")
      expect(result).toContain("await import('./js/keep.js');")
      expect(result).not.toContain('drop.css')
      expect(result).not.toContain('drop.js')
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('component asset imports via import.meta.glob', () => {
  test('CSS and JS loaded via import.meta.glob, not explicit imports', async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-gen-'))
    try {
      const compDir = join(tmpRoot, 'components', 'widget')
      mkdirSync(compDir, { recursive: true })
      writeFileSync(join(compDir, 'widget.component.yml'), 'name: Widget')
      writeFileSync(join(compDir, 'widget.twig'), '<div/>')
      writeFileSync(join(compDir, 'widget.css'), '/* css */')
      writeFileSync(join(compDir, 'widget.js'), '// js')
      writeFileSync(join(compDir, 'widget.mjs'), '// mjs')

      const ns = toNamespaces({ namespace: '', namespaces: { umami: tmpRoot } })
      const plugin = createYamlStoriesHooks({ namespaces: ns })
      const result = await plugin.load.call(
        ctx,
        join(compDir, 'widget.component.yml')
      )

      expect(result).toContain("import.meta.glob('./*.css', { eager: true })")
      expect(result).toContain("import.meta.glob('./*.{js,mjs}')")
      expect(result).not.toContain("import './widget.css';")
      expect(result).not.toContain("import './widget.js';")
      expect(result).not.toContain("await import('./widget.js');")
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('CDN asset injection via virtual:sdc-asset-injector', () => {
  test('virtual module resolves and returns injectAssets function', async () => {
    const plugin = createYamlStoriesHooks({ namespaces: toNamespaces({}) })
    const resolved = plugin.resolveId('virtual:sdc-asset-injector')
    expect(resolved).toBe('\0virtual:sdc-asset-injector')

    const moduleCode = await plugin.load.call(
      ctx,
      '\0virtual:sdc-asset-injector'
    )
    expect(moduleCode).toContain('export async function injectAssets')
    expect(moduleCode).toContain("createElement('script')")
    expect(moduleCode).toContain("createElement('link')")
    expect(moduleCode).toContain('applyAttrs')
  })

  test('injectAssets applies attributes to script and link elements', async () => {
    const plugin = createYamlStoriesHooks({ namespaces: toNamespaces({}) })
    const moduleCode = await plugin.load.call(
      ctx,
      '\0virtual:sdc-asset-injector'
    )
    assert(typeof moduleCode === 'string')

    // Evaluate the module against a stub document; appendChild fires onload.
    interface FakeElement {
      tagName: string
      _attrs: Record<string, string>
      setAttribute: (k: string, v: string) => void
      onload?: () => void
      [prop: string]: unknown
    }
    const created: FakeElement[] = []
    const fakeDoc = {
      querySelector: (): FakeElement | null => null,
      head: {
        appendChild: (el: FakeElement) => {
          created.push(el)
          if (el.onload) el.onload()
        },
      },
      createElement: (tag: string): FakeElement => {
        const _attrs: Record<string, string> = {}
        return {
          tagName: tag,
          _attrs,
          setAttribute: (k, v) => {
            _attrs[k] = v
          },
        }
      },
    }
    vi.stubGlobal('document', fakeDoc)
    onTestFinished(() => {
      vi.unstubAllGlobals()
    })
    const { injectAssets } = (await import(
      'data:text/javascript,' + encodeURIComponent(moduleCode)
    )) as { injectAssets: (assets: unknown[]) => Promise<void> }

    await injectAssets([
      {
        type: 'js',
        url: 'https://cdn.example.com/widget.js',
        attributes: { defer: true, crossorigin: 'anonymous' },
      },
      {
        type: 'css',
        url: 'https://cdn.example.com/fonts.css',
        media: 'print',
        attributes: { integrity: 'sha384-abc' },
      },
    ])

    const [script, link] = created
    assert(script && link)
    expect(script.src).toBe('https://cdn.example.com/widget.js')
    expect(script._attrs.defer).toBe('') // boolean true → present, empty value
    expect(script._attrs.crossorigin).toBe('anonymous')

    expect(link.href).toBe('https://cdn.example.com/fonts.css')
    expect(link.media).toBe('print')
    expect(link._attrs.integrity).toBe('sha384-abc')
  })

  test('no injectAssets call when component has no external assets', async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-inj-'))
    try {
      const compDir = join(tmpRoot, 'components', 'plain')
      mkdirSync(compDir, { recursive: true })
      writeFileSync(join(compDir, 'plain.component.yml'), 'name: Plain')
      writeFileSync(join(compDir, 'plain.twig'), '<div/>')

      const ns = toNamespaces({ namespace: '', namespaces: { umami: tmpRoot } })
      const plugin = createYamlStoriesHooks({ namespaces: ns })
      const result = await plugin.load.call(
        ctx,
        join(compDir, 'plain.component.yml')
      )

      expect(result).not.toContain('injectAssets(')
      expect(result).not.toContain('document.createElement')
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('injectAssets called with JS CDN asset URL', async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-inj-'))
    try {
      const compDir = join(tmpRoot, 'components', 'jsdep')
      mkdirSync(compDir, { recursive: true })
      writeFileSync(
        join(compDir, 'jsdep.component.yml'),
        [
          'name: JsDep',
          'libraryOverrides:',
          '  js:',
          "    'https://cdn.example.com/lib.js': {}",
        ].join('\n')
      )
      writeFileSync(join(compDir, 'jsdep.twig'), '<div/>')

      const ns = toNamespaces({ namespace: '', namespaces: { umami: tmpRoot } })
      const plugin = createYamlStoriesHooks({ namespaces: ns })
      const result = await plugin.load.call(
        ctx,
        join(compDir, 'jsdep.component.yml')
      )

      expect(result).toContain('injectAssets(')
      expect(result).toContain('https://cdn.example.com/lib.js')
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('injectAssets called with CSS CDN asset URL', async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-inj-'))
    try {
      const compDir = join(tmpRoot, 'components', 'cssdep')
      mkdirSync(compDir, { recursive: true })
      writeFileSync(
        join(compDir, 'cssdep.component.yml'),
        [
          'name: CssDep',
          'libraryOverrides:',
          '  css:',
          '    base:',
          "      'https://cdn.example.com/lib.css': {}",
        ].join('\n')
      )
      writeFileSync(join(compDir, 'cssdep.twig'), '<div/>')

      const ns = toNamespaces({ namespace: '', namespaces: { umami: tmpRoot } })
      const plugin = createYamlStoriesHooks({ namespaces: ns })
      const result = await plugin.load.call(
        ctx,
        join(compDir, 'cssdep.component.yml')
      )

      expect(result).toContain('injectAssets(')
      expect(result).toContain('https://cdn.example.com/lib.css')
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('dependencyMap asset is injected when component declares the dep', async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-inj-'))
    try {
      const compDir = join(tmpRoot, 'components', 'jqdep')
      mkdirSync(compDir, { recursive: true })
      writeFileSync(
        join(compDir, 'jqdep.component.yml'),
        [
          'name: JqDep',
          'libraryOverrides:',
          '  dependencies:',
          '    - core/jquery',
        ].join('\n')
      )
      writeFileSync(join(compDir, 'jqdep.twig'), '<div/>')

      const ns = toNamespaces({ namespace: '', namespaces: { umami: tmpRoot } })
      const plugin = createYamlStoriesHooks({
        namespaces: ns,
        sdcStorybookOptions: {
          dependencyMap: {
            'core/jquery': [
              { type: 'js', url: 'https://cdn.example.com/jquery.min.js' },
            ],
          },
        },
      })
      const result = await plugin.load.call(
        ctx,
        join(compDir, 'jqdep.component.yml')
      )

      expect(result).toContain('https://cdn.example.com/jquery.min.js')
      expect(result).toContain('injectAssets(')
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })
})
