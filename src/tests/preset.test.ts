import { describe, expect, test, vi } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Mock dependencies before importing module under test
vi.mock('./definitions.ts', () => ({
  loadAndMergeDefinitions: async () => ({}),
}))

vi.mock('./namespaces.ts', () => ({
  toNamespaces: () => ({
    toTwingNamespaces: () => ({ t: ['p'] }),
    toTwigJsNamespaces: () => ({ t: 'p' }),
    toViteAlias: () => [{ find: '@ns', replacement: '/path/components' }],
    entries: () => [['ns', '/path']],
  }),
}))

vi.mock('vite-plugin-node-polyfills', () => ({
  nodePolyfills: (opts: any) => ({ name: 'nodePolyfills', opts }),
}))

vi.mock('vite-plugin-twing-drupal', async () => {
  return { default: (opts: any) => ({ name: 'twing-plugin', opts }) }
})

vi.mock('vite-plugin-twig-drupal', async () => {
  return { default: (opts: any) => ({ name: 'twig-plugin', opts }) }
})

import { viteFinal, experimental_indexers, staticDirs } from '../preset'

import { DEFAULT_DEPENDENCY_MAP } from '../constants'

describe('preset.viteFinal and helpers', () => {
  test('viteFinal includes nodePolyfills and twing plugin when twigLib=twing', async () => {
    const config: any = { plugins: [] }
    const options: any = { sdcStorybookOptions: { twigLib: 'twing' } }

    const result = await viteFinal(config, options)

    // resolve.alias should be an array of alias objects with `find` and `replacement`
    expect(Array.isArray(result.resolve.alias)).toBe(true)
    expect(result.resolve.alias.length).toBeGreaterThan(0)
    ;(result.resolve.alias || []).forEach((a: any) => {
      expect(typeof a.find).toBe('string')
      expect(a.find.startsWith('@')).toBe(true)
      expect(typeof a.replacement).toBe('string')
      expect(a.replacement.length).toBeGreaterThan(0)
    })

    // plugins should include nodePolyfills and twing-plugin
    const pluginNames = (result.plugins || []).map((p: any) => p.name)
    expect(pluginNames).toEqual(
      expect.arrayContaining(['nodePolyfills', 'twing-plugin'])
    )
  })

  test('viteFinal includes twig plugin when twigLib=twig', async () => {
    const config: any = { plugins: [] }
    const options: any = { sdcStorybookOptions: { twigLib: 'twig' } }

    const result = await viteFinal(config, options)
    const pluginNames = (result.plugins || []).map((p: any) => p.name)
    expect(pluginNames).toEqual(
      expect.arrayContaining(['nodePolyfills', 'twig-plugin'])
    )
  })

  test('viteFinal injects DEFAULT_DEPENDENCY_MAP as head tags', async () => {
    const result = await viteFinal(
      { plugins: [] } as any,
      { sdcStorybookOptions: {} } as any
    )
    const headPlugin = result.plugins?.find(
      (p: any) => p?.name === 'vite-plugin-sdc-head'
    )
    expect(headPlugin).toBeDefined()
    const tags = headPlugin.transformIndexHtml()
    expect(
      tags.some(
        (t: any) => t.tag === 'script' && t.attrs?.src?.includes('drupal.js')
      )
    ).toBe(true)
    expect(
      tags.some(
        (t: any) =>
          t.tag === 'link' && t.attrs?.href?.includes('hidden.module.css')
      )
    ).toBe(true)
    expect(Object.keys(DEFAULT_DEPENDENCY_MAP).length).toBeGreaterThan(0)
  })

  test('viteFinal allows overriding a default dep via dependencyMap', async () => {
    const result = await viteFinal(
      { plugins: [] } as any,
      { sdcStorybookOptions: { dependencyMap: { 'core/once': [] } } } as any
    )
    const headPlugin = result.plugins?.find(
      (p: any) => p?.name === 'vite-plugin-sdc-head'
    )
    expect(headPlugin).toBeDefined()
    const tags = headPlugin.transformIndexHtml()
    expect(tags.every((t: any) => !t.attrs?.src?.includes('once'))).toBe(true)
  })

  test('experimental_indexers includes yamlStoriesIndexer', async () => {
    const arr = await (
      experimental_indexers as (e?: unknown) => Promise<unknown[]>
    )(undefined)
    expect(Array.isArray(arr)).toBe(true)
    // should have an indexer with a test regexp for component.yml
    expect(
      arr.some(
        (i: any) => i.test && i.test.test && i.test.test('file.component.yml')
      )
    ).toBe(true)
    // and at least one indexer should expose createIndex as a function
    expect(arr.some((i: any) => typeof i.createIndex === 'function')).toBe(true)
  })

  test('staticDirs serves icon source directories (not namespace roots) under /sdc-icons/{ns}/', async () => {
    const options: any = { sdcStorybookOptions: { namespace: 'umami' } }
    const result = await staticDirs([], options)
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
    expect(
      result.every(
        (d: any) => typeof d.from === 'string' && d.to.startsWith('/sdc-icons/')
      )
    ).toBe(true)
    const nsRoot = process.cwd()
    expect(result.every((d: any) => d.from !== nsRoot)).toBe(true)
  })

  test('staticDirs preserves existing entries', async () => {
    const options: any = { sdcStorybookOptions: { namespace: 'umami' } }
    const existing = [{ from: '../components', to: '/components' }]
    const result = await staticDirs(existing, options)
    expect(result).toContainEqual({ from: '../components', to: '/components' })
    expect(result.some((d: any) => d.to?.startsWith('/sdc-icons/'))).toBe(true)
  })

  test('staticDirs: svg-only pack adds no static entries', async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-preset-svg-'))
    const ns = 'presetsvg'
    try {
      mkdirSync(join(tmpRoot, 'icons'))
      writeFileSync(join(tmpRoot, 'icons', 'a.svg'), '<svg><path/></svg>')
      writeFileSync(
        join(tmpRoot, `${ns}.icons.yml`),
        `pack:\n  extractor: svg\n  config:\n    sources:\n      - icons\n  template: ""\n`
      )
      const options: any = {
        sdcStorybookOptions: { namespaces: { [ns]: tmpRoot } },
      }
      const result = await staticDirs([], options)
      expect(result.every((d: any) => !d.to?.includes(ns))).toBe(true)
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('staticDirs: path extractor adds source directory', async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-preset-path-'))
    const ns = 'presetpath'
    try {
      mkdirSync(join(tmpRoot, 'img'))
      writeFileSync(join(tmpRoot, 'img', 'arrow.png'), 'PNG')
      writeFileSync(
        join(tmpRoot, `${ns}.icons.yml`),
        `pack:\n  extractor: path\n  config:\n    sources:\n      - img/*.png\n  template: ""\n`
      )
      const options: any = {
        sdcStorybookOptions: { namespaces: { [ns]: tmpRoot } },
      }
      const result = await staticDirs([], options)
      const entry = result.find((d: any) =>
        d.to?.startsWith(`/sdc-icons/${ns}/`)
      )
      expect(entry).toBeDefined()
      expect((entry as { from: string }).from).toContain('img')
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('viteFinal preserves existing plugins and merges aliases', async () => {
    const existingPlugin = { name: 'existing' }
    const config: any = { plugins: [existingPlugin], resolve: { alias: [] } }
    const options: any = { sdcStorybookOptions: { twigLib: 'twing' } }

    const result = await viteFinal(config, options)
    const pluginNames = (result.plugins || []).map((p: any) => p.name)

    // existing plugin should be preserved
    expect(pluginNames).toContain('existing')
    // and polyfills + twing plugin should be added
    expect(pluginNames).toEqual(
      expect.arrayContaining(['existing', 'nodePolyfills', 'twing-plugin'])
    )

    // aliases should include at least one entry with find starting with '@'
    expect(Array.isArray(result.resolve.alias)).toBe(true)
    expect(
      result.resolve.alias.some(
        (a: any) => typeof a.find === 'string' && a.find.startsWith('@')
      )
    ).toBe(true)
  })
})
