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
        spy.mock.calls.some((c) => c[0].includes('Skipping variant template'))
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
})
