import { describe, expect, test, vi } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import YamlStoriesPlugin, {
  yamlStoriesIndexer,
} from '../vite-plugin-storybook-yaml-stories.ts'
import { toNamespaces } from '../namespaces.ts'
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
      expect(result).toContain('docs: {description: {component: "Banner desc"}}')
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
      expect(result).toContain('docs: {description: {component: "Branding desc"}}')
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
      // imports for assets and component twig
      expect(result).toContain("import './card.js';")
      expect(result).toContain("import './card.css';")
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
        makeTitle: (s: string) => s,
      })
      expect(Array.isArray(index)).toBe(true)
      expect(index[0]).toHaveProperty('importPath', file)
      expect(index[0]).toHaveProperty('exportName')
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('generateImports skips variant twig files and logs skipping', async () => {
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
      const spy = vi.spyOn(logger, 'info')

      const plugin = YamlStoriesPlugin({ namespaces })
      const id = join(compDir, 'card.component.yml')

      await plugin.load(id)

      expect(
        spy.mock.calls.some((c) => typeof c[0] === 'string' && c[0].includes('Skipping variant template'))
      ).toBe(true)
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
        makeTitle: (s: string) => s,
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
        yamlStoriesIndexer.createIndex(missing, { makeTitle: (s: string) => s })
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
        makeTitle: (s: string) => s,
      })

      // Should have Basic + Variant_Basic + Other
      expect(index.length).toBe(3)
      expect(index.find((i: any) => i.exportName === 'Basic')).toBeDefined()
      expect(index.find((i: any) => i.exportName === 'Variant_Basic')).toBeDefined()
      expect(index.find((i: any) => i.exportName === 'Other')).toBeDefined()
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })
})
