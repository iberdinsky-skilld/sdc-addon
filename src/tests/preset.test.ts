import { describe, expect, test, vi } from 'vitest'

// Mock dependencies before importing module under test
vi.mock('./definitions.ts', () => ({
  loadAndMergeDefinitions: async () => ({}),
}))

vi.mock('./namespaces.ts', () => ({
  toNamespaces: () => ({
    toTwingNamespaces: () => ({ t: ['p'] }),
    toTwigJsNamespaces: () => ({ t: 'p' }),
    toViteAlias: () => [{ find: '@ns', replacement: '/path/components' }],
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

import { viteFinal, previewHead, experimental_indexers } from '../preset'

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

  test('previewHead injects head and scripts', () => {
    const out = previewHead('<meta name="x"/>')
    expect(out).toContain('<script')
    expect(out).toContain('<style>')
    expect(out).toContain('<meta name="x"/>')
  })

  test('experimental_indexers includes yamlStoriesIndexer', async () => {
    const arr = await experimental_indexers(undefined)
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
