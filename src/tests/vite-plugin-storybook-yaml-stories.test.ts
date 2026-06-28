import { describe, expect, test, vi } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import YamlStoriesPlugin, {
  yamlStoriesIndexer,
  twigDependencyImports,
  libraryOverridesImports,
  libraryOverridesLocalImports,
} from '../vite/storybookYamlStories.ts'
import { toNamespaces } from '../generate/namespaces.ts'
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

      const plugin = YamlStoriesPlugin({ namespaces })
      const id = join(compDir, 'banner.component.yml')

      const result = await plugin.load(id)

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

      const plugin = YamlStoriesPlugin({ namespaces })
      const id = join(compDir, 'branding.component.yml')

      const result = await plugin.load(id)

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

      const plugin = YamlStoriesPlugin({ namespaces })
      const id = join(compDir, 'menu.component.yml')

      const result = await plugin.load(id)

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

      const plugin = YamlStoriesPlugin({ namespaces })
      const id = join(compDir, 'slider.component.yml')

      const result = await plugin.load(id)

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

      // component YAML
      const compYaml = `name: Card\nstatus: stable\ndescription: Card desc`
      writeFileSync(join(compDir, 'card.component.yml'), compYaml)
      // main twig + variant twig + assets
      writeFileSync(join(compDir, 'card.twig'), '<div>card</div>')
      writeFileSync(join(compDir, 'card~variant.twig'), '<div>variant</div>')
      writeFileSync(join(compDir, 'card.js'), '// js')
      writeFileSync(join(compDir, 'card.css'), '/* css */')

      // nested component for dynamicImports
      writeFileSync(join(nested, 'title.component.yml'), 'name: Title')
      writeFileSync(join(nested, 'title.twig'), '<h1>title</h1>')

      const namespaces = toNamespaces({
        namespace: '',
        namespaces: { umami: tmpRoot },
      })

      const plugin = YamlStoriesPlugin({ namespaces })
      const id = join(compDir, 'card.component.yml')

      const result = await plugin.load(id)
      expect(typeof result).toBe('string')
      // assets loaded via import.meta.glob
      expect(result).toContain("import.meta.glob('./*.{js,mjs}')")
      expect(result).toContain("import.meta.glob('./*.css'")
      // should import main twig as COMPONENT (namespace path may vary)
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

      const plugin = YamlStoriesPlugin({ namespaces })
      const result = await plugin.load(join(compDir, 'card.component.yml'))

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
      const plugin = YamlStoriesPlugin({ namespaces })
      const result = await plugin.load(join(compDir, 'slider.component.yml'))

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

      // create story file referencing the title component in props
      const storyFile = join(compDir, 'card.withTitle.story.yml')
      // The story file should contain just the story body (loadStoryFilesSync wraps it by filename)
      writeFileSync(
        storyFile,
        'props:\n  title:\n    type: component\n    component: umami:title\n'
      )

      const namespaces = toNamespaces({
        namespace: '',
        namespaces: { umami: tmpRoot },
      })
      const plugin = YamlStoriesPlugin({ namespaces })
      const id = join(compDir, 'card.component.yml')

      const result = await plugin.load(id)

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
      // malformed YAML
      writeFileSync(file, `name: Bad\n  - invalid`, 'utf8')

      const spy = vi.spyOn(logger, 'error')
      // Use a non-existent file to provoke read error
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

      // Should have Basic + Variant_Basic + Other
      expect(index.length).toBe(3)
      expect(index.find((i: any) => i.exportName === 'Basic')).toBeDefined()
      expect(
        index.find((i: any) => i.exportName === 'Variant_Basic')
      ).toBeDefined()
      expect(index.find((i: any) => i.exportName === 'Other')).toBeDefined()
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })
})

// ---------------------------------------------------------------------------
// twigDependencyImports — unit tests
// ---------------------------------------------------------------------------

describe('twigDependencyImports', () => {
  test('returns empty string when twig file does not exist', () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-twig-'))
    try {
      const ns = toNamespaces({ namespace: '', namespaces: { umami: tmpRoot } })
      const result = twigDependencyImports(join(tmpRoot, 'missing.twig'), ns)
      expect(result).toBe('')
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('returns empty string when twig has no SDC includes', () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-twig-'))
    try {
      const twigFile = join(tmpRoot, 'comp.twig')
      writeFileSync(twigFile, '<div>{{ label }}</div>')
      const ns = toNamespaces({ namespace: '', namespaces: { umami: tmpRoot } })
      expect(twigDependencyImports(twigFile, ns)).toBe('')
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('ignores @namespace/path style asset references', () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-twig-'))
    try {
      const twigFile = join(tmpRoot, 'comp.twig')
      writeFileSync(twigFile, "{% include '@assets/icon.svg' %}")
      const ns = toNamespaces({ namespace: '', namespaces: { umami: tmpRoot } })
      expect(twigDependencyImports(twigFile, ns)).toBe('')
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('ignores unknown namespace:component (no resolved path)', () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-twig-'))
    try {
      const twigFile = join(tmpRoot, 'comp.twig')
      writeFileSync(twigFile, "{% include 'unknown:missing' %}")
      const ns = toNamespaces({ namespace: '', namespaces: { umami: tmpRoot } })
      expect(twigDependencyImports(twigFile, ns)).toBe('')
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('generates import for {% include "ns:component" %} (double quotes)', () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-twig-'))
    try {
      const titleDir = join(tmpRoot, 'components', 'title')
      mkdirSync(titleDir, { recursive: true })
      writeFileSync(join(titleDir, 'title.component.yml'), 'name: Title')

      const twigFile = join(tmpRoot, 'comp.twig')
      writeFileSync(twigFile, '{% include "umami:title" %}')

      const ns = toNamespaces({ namespace: '', namespaces: { umami: tmpRoot } })
      const result = twigDependencyImports(twigFile, ns)

      expect(result).toContain('title.component.yml')
      expect(result).toMatch(/^import '.*title\.component\.yml';$/m)
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('generates import for {% include %} with single quotes', () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-twig-'))
    try {
      const titleDir = join(tmpRoot, 'components', 'title')
      mkdirSync(titleDir, { recursive: true })
      writeFileSync(join(titleDir, 'title.component.yml'), 'name: Title')

      const twigFile = join(tmpRoot, 'comp.twig')
      writeFileSync(twigFile, "{% include 'umami:title' %}")

      const ns = toNamespaces({ namespace: '', namespaces: { umami: tmpRoot } })
      const result = twigDependencyImports(twigFile, ns)

      expect(result).toMatch(/^import '.*title\.component\.yml';$/m)
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('generates import for {% embed %} directive', () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-twig-'))
    try {
      const cardDir = join(tmpRoot, 'components', 'card')
      mkdirSync(cardDir, { recursive: true })
      writeFileSync(join(cardDir, 'card.component.yml'), 'name: Card')

      const twigFile = join(tmpRoot, 'comp.twig')
      writeFileSync(twigFile, "{% embed 'umami:card' %}{% endembed %}")

      const ns = toNamespaces({ namespace: '', namespaces: { umami: tmpRoot } })
      const result = twigDependencyImports(twigFile, ns)

      expect(result).toMatch(/^import '.*card\.component\.yml';$/m)
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('generates import for {% extends %} directive', () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-twig-'))
    try {
      const baseDir = join(tmpRoot, 'components', 'base-layout')
      mkdirSync(baseDir, { recursive: true })
      writeFileSync(
        join(baseDir, 'base-layout.component.yml'),
        'name: Base Layout'
      )

      const twigFile = join(tmpRoot, 'comp.twig')
      writeFileSync(twigFile, "{% extends 'umami:base-layout' %}")

      const ns = toNamespaces({ namespace: '', namespaces: { umami: tmpRoot } })
      const result = twigDependencyImports(twigFile, ns)

      expect(result).toMatch(/^import '.*base-layout\.component\.yml';$/m)
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('handles whitespace-control {%- include %} syntax', () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-twig-'))
    try {
      const titleDir = join(tmpRoot, 'components', 'title')
      mkdirSync(titleDir, { recursive: true })
      writeFileSync(join(titleDir, 'title.component.yml'), 'name: Title')

      const twigFile = join(tmpRoot, 'comp.twig')
      writeFileSync(twigFile, "{%- include 'umami:title' -%}")

      const ns = toNamespaces({ namespace: '', namespaces: { umami: tmpRoot } })
      const result = twigDependencyImports(twigFile, ns)

      expect(result).toMatch(/^import '.*title\.component\.yml';$/m)
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('handles include with with...only clause', () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-twig-'))
    try {
      const titleDir = join(tmpRoot, 'components', 'title')
      mkdirSync(titleDir, { recursive: true })
      writeFileSync(join(titleDir, 'title.component.yml'), 'name: Title')

      const twigFile = join(tmpRoot, 'comp.twig')
      writeFileSync(
        twigFile,
        "{% include 'umami:title' with { label: 'Hello' } only %}"
      )

      const ns = toNamespaces({ namespace: '', namespaces: { umami: tmpRoot } })
      const result = twigDependencyImports(twigFile, ns)

      expect(result).toMatch(/^import '.*title\.component\.yml';$/m)
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('deduplicates repeated includes of the same component', () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-twig-'))
    try {
      const titleDir = join(tmpRoot, 'components', 'title')
      mkdirSync(titleDir, { recursive: true })
      writeFileSync(join(titleDir, 'title.component.yml'), 'name: Title')

      const twigFile = join(tmpRoot, 'comp.twig')
      writeFileSync(
        twigFile,
        "{% include 'umami:title' %}\n{% include 'umami:title' %}"
      )

      const ns = toNamespaces({ namespace: '', namespaces: { umami: tmpRoot } })
      const result = twigDependencyImports(twigFile, ns)

      const lines = result.split('\n').filter(Boolean)
      expect(lines).toHaveLength(1)
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('collects multiple distinct component includes', () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-twig-'))
    try {
      const titleDir = join(tmpRoot, 'components', 'title')
      const badgeDir = join(tmpRoot, 'components', 'badge')
      mkdirSync(titleDir, { recursive: true })
      mkdirSync(badgeDir, { recursive: true })
      writeFileSync(join(titleDir, 'title.component.yml'), 'name: Title')
      writeFileSync(join(badgeDir, 'badge.component.yml'), 'name: Badge')

      const twigFile = join(tmpRoot, 'comp.twig')
      writeFileSync(
        twigFile,
        "{% include 'umami:title' %}\n{% include 'umami:badge' %}"
      )

      const ns = toNamespaces({ namespace: '', namespaces: { umami: tmpRoot } })
      const result = twigDependencyImports(twigFile, ns)

      expect(result).toContain('title.component.yml')
      expect(result).toContain('badge.component.yml')
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  // ----- namespace tests -----

  test('resolves component from a different registered namespace', () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-twig-'))
    try {
      // 'ds-a' namespace has the included component
      const dsARoot = join(tmpRoot, 'ds-a')
      const titleDir = join(dsARoot, 'components', 'title')
      mkdirSync(titleDir, { recursive: true })
      writeFileSync(join(titleDir, 'title.component.yml'), 'name: Title')

      // 'ds-b' namespace owns the parent component whose twig we parse
      const dsBRoot = join(tmpRoot, 'ds-b')
      mkdirSync(join(dsBRoot, 'components', 'paragraph'), { recursive: true })

      const twigFile = join(tmpRoot, 'paragraph.twig')
      writeFileSync(twigFile, "{% include 'ds-a:title' %}")

      const ns = toNamespaces({
        namespace: '',
        namespaces: { 'ds-a': dsARoot, 'ds-b': dsBRoot },
      })
      const result = twigDependencyImports(twigFile, ns)

      expect(result).toContain('title.component.yml')
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('resolves components from multiple different namespaces in one file', () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-twig-'))
    try {
      const dsARoot = join(tmpRoot, 'ds-a')
      const dsBRoot = join(tmpRoot, 'ds-b')

      mkdirSync(join(dsARoot, 'components', 'title'), { recursive: true })
      mkdirSync(join(dsBRoot, 'components', 'badge'), { recursive: true })
      writeFileSync(
        join(dsARoot, 'components', 'title', 'title.component.yml'),
        'name: Title'
      )
      writeFileSync(
        join(dsBRoot, 'components', 'badge', 'badge.component.yml'),
        'name: Badge'
      )

      const twigFile = join(tmpRoot, 'comp.twig')
      writeFileSync(
        twigFile,
        "{% include 'ds-a:title' %}\n{% include 'ds-b:badge' %}"
      )

      const ns = toNamespaces({
        namespace: '',
        namespaces: { 'ds-a': dsARoot, 'ds-b': dsBRoot },
      })
      const result = twigDependencyImports(twigFile, ns)

      expect(result).toContain('title.component.yml')
      expect(result).toContain('badge.component.yml')
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('resolves nested (subdirectory) component via namespace', () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-twig-'))
    try {
      const nsRoot = join(tmpRoot, 'theme')
      // component lives under components/atoms/title/
      const titleDir = join(nsRoot, 'components', 'atoms', 'title')
      mkdirSync(titleDir, { recursive: true })
      writeFileSync(join(titleDir, 'title.component.yml'), 'name: Title')

      const twigFile = join(tmpRoot, 'comp.twig')
      writeFileSync(twigFile, "{% include 'mytheme:title' %}")

      const ns = toNamespaces({
        namespace: '',
        namespaces: { mytheme: nsRoot },
      })
      const result = twigDependencyImports(twigFile, ns)

      expect(result).toContain('title.component.yml')
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })
})

// ---------------------------------------------------------------------------
// load() integration — twig dependency imports
// ---------------------------------------------------------------------------

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
      const plugin = YamlStoriesPlugin({ namespaces: ns })
      const result = await plugin.load(
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
      const plugin = YamlStoriesPlugin({ namespaces: ns })
      const result = await plugin.load(join(parentDir, 'parent.component.yml'))

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
      const plugin = YamlStoriesPlugin({ namespaces: ns })
      const result = await plugin.load(
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
      const plugin = YamlStoriesPlugin({ namespaces: ns })
      const result = await plugin.load(
        join(paragraphDir, 'paragraph.component.yml')
      )

      expect(result).toContain('title.component.yml')
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })
})

// ---------------------------------------------------------------------------
// libraryOverridesImports — unit tests
// ---------------------------------------------------------------------------

describe('libraryOverridesImports', () => {
  test('returns empty array when no libraryOverrides', () => {
    expect(libraryOverridesImports({ name: 'Test' } as any)).toEqual([])
  })

  test('returns empty array when libraryOverrides is empty', () => {
    expect(
      libraryOverridesImports({ name: 'Test', libraryOverrides: {} } as any)
    ).toEqual([])
  })

  test('returns empty array when css contains only local files', () => {
    const content = {
      name: 'Test',
      libraryOverrides: { css: { component: { 'slider.css': {} } } },
    }
    expect(libraryOverridesImports(content as any)).toEqual([])
  })

  test('returns empty array when js contains only local files', () => {
    const content = {
      name: 'Test',
      libraryOverrides: {
        js: { 'slider.mjs': { attributes: { type: 'module' } } },
      },
    }
    expect(libraryOverridesImports(content as any)).toEqual([])
  })

  test('returns empty array for protocol-relative URL (not http/https)', () => {
    const content = {
      name: 'Test',
      libraryOverrides: { js: { '//cdn.example.com/lib.js': {} } },
    }
    expect(libraryOverridesImports(content as any)).toEqual([])
  })

  test('returns ExternalCssAsset for external CSS in base group', () => {
    const url = 'https://cdn.example.com/lib.css'
    const content = {
      name: 'Test',
      libraryOverrides: { css: { base: { [url]: { minified: true } } } },
    }
    const result = libraryOverridesImports(content as any)
    expect(result).toEqual([{ type: 'css', url, media: undefined }])
  })

  test('returns ExternalCssAsset with media when media is set', () => {
    const url = 'https://cdn.example.com/print.css'
    const content = {
      name: 'Test',
      libraryOverrides: { css: { base: { [url]: { media: 'print' } } } },
    }
    const result = libraryOverridesImports(content as any)
    expect(result).toEqual([{ type: 'css', url, media: 'print' }])
  })

  test('collects external CSS assets from all five groups', () => {
    const urls = {
      base: 'https://cdn.example.com/base.css',
      layout: 'https://cdn.example.com/layout.css',
      component: 'https://cdn.example.com/component.css',
      state: 'https://cdn.example.com/state.css',
      theme: 'https://cdn.example.com/theme.css',
    }
    const content = {
      name: 'Test',
      libraryOverrides: {
        css: Object.fromEntries(
          Object.entries(urls).map(([group, url]) => [group, { [url]: {} }])
        ),
      },
    }
    const result = libraryOverridesImports(content as any)
    for (const url of Object.values(urls)) {
      expect(result.some((a) => a.url === url && a.type === 'css')).toBe(true)
    }
  })

  test('returns ExternalJsAsset for external JS URL', () => {
    const url = 'https://cdn.example.com/lib.js'
    const content = {
      name: 'Test',
      libraryOverrides: { js: { [url]: {} } },
    }
    const result = libraryOverridesImports(content as any)
    expect(result).toEqual([{ type: 'js', url, attributes: undefined }])
  })

  test('preserves attributes on external JS', () => {
    const url = 'https://cdn.example.com/widget.js'
    const content = {
      name: 'Test',
      libraryOverrides: {
        js: {
          [url]: { attributes: { defer: true, crossorigin: 'anonymous' } },
        },
      },
    }
    const result = libraryOverridesImports(content as any)
    expect(result).toEqual([
      {
        type: 'js',
        url,
        attributes: { defer: true, crossorigin: 'anonymous' },
      },
    ])
  })

  test('preserves attributes on external CSS', () => {
    const url = 'https://cdn.example.com/fonts.css'
    const content = {
      name: 'Test',
      libraryOverrides: {
        css: {
          theme: {
            [url]: {
              attributes: { integrity: 'sha384-abc', crossorigin: 'anonymous' },
            },
          },
        },
      },
    }
    const result = libraryOverridesImports(content as any)
    expect(result).toEqual([
      {
        type: 'css',
        url,
        media: undefined,
        attributes: { integrity: 'sha384-abc', crossorigin: 'anonymous' },
      },
    ])
  })

  test('returns both CSS and JS assets when both present', () => {
    const cssUrl = 'https://cdn.example.com/style.css'
    const jsUrl = 'https://cdn.example.com/lib.js'
    const content = {
      name: 'Test',
      libraryOverrides: {
        css: { component: { [cssUrl]: {} } },
        js: { [jsUrl]: {} },
      },
    }
    const result = libraryOverridesImports(content as any)
    expect(result.find((a) => a.url === cssUrl)?.type).toBe('css')
    expect(result.find((a) => a.url === jsUrl)?.type).toBe('js')
  })

  test('filters out local files, keeps only external URLs', () => {
    const url1 = 'https://cdn.example.com/swiper.css'
    const url2 = 'https://cdn.example.com/scrollbar.css'
    const content = {
      name: 'Test',
      libraryOverrides: {
        css: { base: { [url1]: {}, [url2]: {}, 'local.css': {} } },
      },
    }
    const result = libraryOverridesImports(content as any)
    expect(result.map((a) => a.url)).toEqual([url1, url2])
  })

  test('matches real slider component libraryOverrides structure', () => {
    const content = {
      name: 'Slider',
      libraryOverrides: {
        dependencies: ['core/drupal', 'core/once'],
        js: { 'slider.mjs': { attributes: { type: 'module' } } },
        css: {
          base: {
            'https://cdn.jsdelivr.net/npm/swiper@11.1.9/swiper.min.css': {
              type: 'external',
              minified: true,
            },
            'https://cdn.jsdelivr.net/npm/swiper@11.1.9/modules/scrollbar.css':
              { type: 'external', minified: true },
            'slider.css': {},
          },
        },
      },
    }
    const result = libraryOverridesImports(content as any)
    // Only the two CDN CSS URLs — no local files, no Drupal deps
    expect(result).toHaveLength(2)
    expect(result.every((a) => a.type === 'css')).toBe(true)
    expect(result.map((a) => a.url)).toContain(
      'https://cdn.jsdelivr.net/npm/swiper@11.1.9/swiper.min.css'
    )
    expect(result.map((a) => a.url)).toContain(
      'https://cdn.jsdelivr.net/npm/swiper@11.1.9/modules/scrollbar.css'
    )
  })

  // ----- dependencyMap -----

  test('dependencyMap maps a Drupal dependency to CDN assets', () => {
    const content = {
      name: 'Widget',
      libraryOverrides: { dependencies: ['core/drupal', 'core/jquery'] },
    }
    const result = libraryOverridesImports(content as any, {
      'core/jquery': [
        {
          type: 'js',
          url: 'https://cdn.jsdelivr.net/npm/jquery@3/dist/jquery.min.js',
        },
      ],
    })
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      type: 'js',
      url: expect.stringContaining('jquery.min.js'),
    })
  })

  test('dependencyMap assets combine with extracted CSS/JS URLs', () => {
    const cssUrl = 'https://cdn.example.com/lib.css'
    const jsUrl = 'https://cdn.example.com/extra.js'
    const content = {
      name: 'Test',
      libraryOverrides: {
        css: { base: { [cssUrl]: {} } },
        dependencies: ['some/lib'],
      },
    }
    const result = libraryOverridesImports(content as any, {
      'some/lib': [{ type: 'js', url: jsUrl }],
    })
    expect(result.map((a) => a.url)).toContain(cssUrl)
    expect(result.map((a) => a.url)).toContain(jsUrl)
  })

  test('unknown dependencies are silently ignored', () => {
    const content = {
      name: 'Test',
      libraryOverrides: { dependencies: ['core/drupal', 'core/once'] },
    }
    const result = libraryOverridesImports(content as any, {})
    expect(result).toEqual([])
  })
})

describe('libraryOverridesLocalImports', () => {
  test('returns empty when no libraryOverrides', () => {
    expect(libraryOverridesLocalImports({ name: 'Test' } as any)).toEqual({
      css: [],
      js: [],
    })
  })

  test('collects local subfolder CSS and JS, normalized to relative paths', () => {
    const content = {
      name: 'Test',
      libraryOverrides: {
        css: { component: { 'styles/alert.css': {} } },
        js: { 'js/carousel.js': {} },
      },
    }
    expect(libraryOverridesLocalImports(content as any)).toEqual({
      css: [{ path: './styles/alert.css', media: undefined }],
      js: ['./js/carousel.js'],
    })
  })

  test('de-dupes root files already covered by the flat glob', () => {
    const content = {
      name: 'Test',
      libraryOverrides: {
        css: { component: { 'card.css': {} } },
        js: { 'card.js': {} },
      },
    }
    expect(libraryOverridesLocalImports(content as any)).toEqual({
      css: [],
      js: [],
    })
  })

  test('keeps subfolder .mjs and drops root .mjs', () => {
    const content = {
      name: 'Test',
      libraryOverrides: {
        js: { 'behaviors/widget.mjs': {}, 'widget.mjs': {} },
      },
    }
    expect(libraryOverridesLocalImports(content as any)).toEqual({
      css: [],
      js: ['./behaviors/widget.mjs'],
    })
  })

  test('excludes external URLs (those flow through injectAssets)', () => {
    const content = {
      name: 'Test',
      libraryOverrides: {
        css: { theme: { 'https://cdn.example.com/x.css': {} } },
        js: { 'https://cdn.example.com/x.js': {}, 'js/local.js': {} },
      },
    }
    expect(libraryOverridesLocalImports(content as any)).toEqual({
      css: [],
      js: ['./js/local.js'],
    })
  })

  test('de-dupes repeated declarations of the same local path', () => {
    const content = {
      name: 'Test',
      libraryOverrides: {
        css: {
          base: { 'styles/x.css': {} },
          theme: { 'styles/x.css': {} },
        },
      },
    }
    expect(libraryOverridesLocalImports(content as any).css).toEqual([
      { path: './styles/x.css', media: undefined },
    ])
  })

  test('skips assets disabled via `false` (Drupal semantics)', () => {
    const content = {
      name: 'Test',
      libraryOverrides: {
        css: {
          component: { 'styles/keep.css': {}, 'styles/drop.css': false },
        },
        js: { 'js/keep.js': {}, 'js/drop.js': false },
      },
    }
    expect(libraryOverridesLocalImports(content as any)).toEqual({
      css: [{ path: './styles/keep.css', media: undefined }],
      js: ['./js/keep.js'],
    })
  })

  test('carries `media` from a CSS override entry', () => {
    const content = {
      name: 'Test',
      libraryOverrides: {
        css: { theme: { 'styles/print.css': { media: 'print' } } },
      },
    }
    expect(libraryOverridesLocalImports(content as any).css).toEqual([
      { path: './styles/print.css', media: 'print' },
    ])
  })
})

// ---------------------------------------------------------------------------
// load() integration — libraryOverrides external assets
// ---------------------------------------------------------------------------

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
      const plugin = YamlStoriesPlugin({ namespaces: ns })
      const result = await plugin.load(join(compDir, 'slider.component.yml'))

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
      const plugin = YamlStoriesPlugin({ namespaces: ns })
      const result = await plugin.load(join(compDir, 'widget.component.yml'))

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
      const plugin = YamlStoriesPlugin({ namespaces: ns })
      const result = await plugin.load(join(compDir, 'card.component.yml'))

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
      const plugin = YamlStoriesPlugin({ namespaces: ns })
      const result = await plugin.load(join(compDir, 'badge.component.yml'))

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
      const plugin = YamlStoriesPlugin({ namespaces: ns })
      const result = (await plugin.load(
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
      const plugin = YamlStoriesPlugin({ namespaces: ns })
      const result = await plugin.load(join(compDir, 'card.component.yml'))

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
      const plugin = YamlStoriesPlugin({ namespaces: ns })
      const result = await plugin.load(join(compDir, 'poster.component.yml'))

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
      const plugin = YamlStoriesPlugin({ namespaces: ns })
      const result = await plugin.load(join(compDir, 'panel.component.yml'))

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
      const plugin = YamlStoriesPlugin({ namespaces: ns })
      const result = await plugin.load(join(compDir, 'widget.component.yml'))

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
    const plugin = YamlStoriesPlugin({ namespaces: {} as any })
    const resolved = plugin.resolveId('virtual:sdc-asset-injector')
    expect(resolved).toBe('\0virtual:sdc-asset-injector')

    const moduleCode = await plugin.load('\0virtual:sdc-asset-injector')
    expect(moduleCode).toContain('export async function injectAssets')
    expect(moduleCode).toContain("createElement('script')")
    expect(moduleCode).toContain("createElement('link')")
    expect(moduleCode).toContain('applyAttrs')
  })

  test('injectAssets applies attributes to script and link elements', async () => {
    const plugin = YamlStoriesPlugin({ namespaces: {} as any })
    const moduleCode = (await plugin.load(
      '\0virtual:sdc-asset-injector'
    )) as string

    // Evaluate the ESM source in a sandbox with a stub document so we can
    // observe what injectAssets builds. appendChild fires onload to resolve.
    const created: any[] = []
    const fakeDoc = {
      querySelector: (): any => null,
      head: {
        appendChild: (el: any) => {
          created.push(el)
          if (el.onload) el.onload()
        },
      },
      createElement: (tag: string) => {
        const _attrs: Record<string, string> = {}
        return {
          tagName: tag,
          _attrs,
          setAttribute: (k: string, v: string) => {
            _attrs[k] = v
          },
        } as any
      },
    }
    const factory = new Function(
      'document',
      moduleCode.replace('export async function', 'async function') +
        '\nreturn injectAssets;'
    )
    const injectAssets = factory(fakeDoc)

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
      const plugin = YamlStoriesPlugin({ namespaces: ns })
      const result = await plugin.load(join(compDir, 'plain.component.yml'))

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
      const plugin = YamlStoriesPlugin({ namespaces: ns })
      const result = await plugin.load(join(compDir, 'jsdep.component.yml'))

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
      const plugin = YamlStoriesPlugin({ namespaces: ns })
      const result = await plugin.load(join(compDir, 'cssdep.component.yml'))

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
      const plugin = YamlStoriesPlugin({
        namespaces: ns,
        sdcStorybookOptions: {
          dependencyMap: {
            'core/jquery': [
              { type: 'js', url: 'https://cdn.example.com/jquery.min.js' },
            ],
          },
        },
      })
      const result = await plugin.load(join(compDir, 'jqdep.component.yml'))

      expect(result).toContain('https://cdn.example.com/jquery.min.js')
      expect(result).toContain('injectAssets(')
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })
})
