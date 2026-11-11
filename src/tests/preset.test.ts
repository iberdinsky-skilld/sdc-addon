import { describe, expect, test, vi } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type {
  Alias,
  AliasOptions,
  HtmlTagDescriptor,
  Plugin,
  PluginOption,
  UserConfig,
} from 'vite'
import type { SDCAddonOptions } from '../sdc.d.ts'

vi.mock('vite-plugin-node-polyfills', () => ({
  nodePolyfills: (opts: unknown) => ({ name: 'nodePolyfills', opts }),
}))

vi.mock('vite-plugin-twing-drupal', () => {
  return { default: (opts: unknown) => ({ name: 'twing-plugin', opts }) }
})

vi.mock('vite-plugin-twig-drupal', () => {
  return { default: (opts: unknown) => ({ name: 'twig-plugin', opts }) }
})

import {
  viteFinal,
  dependencyHeadTags,
  indexersWithYaml,
  staticDirs,
} from '../preset'

import { DEFAULT_DEPENDENCY_MAP } from '../constants'

// Vite's config types allow nested arrays, promises and alias maps; the preset
// only produces flat plugin objects and an alias list.
const isPlugin = (p: PluginOption): p is Plugin =>
  typeof p === 'object' &&
  p !== null &&
  !Array.isArray(p) &&
  !(p instanceof Promise) &&
  'name' in p

const pluginsOf = (config: UserConfig): Plugin[] =>
  (config.plugins ?? []).filter(isPlugin)

const pluginNames = (config: UserConfig): string[] =>
  pluginsOf(config).map((p) => p.name)

const isAliasList = (a: AliasOptions | undefined): a is readonly Alias[] =>
  Array.isArray(a)

const aliasesOf = (config: UserConfig): readonly Alias[] => {
  const alias = config.resolve?.alias
  return isAliasList(alias) ? alias : []
}

const attr = (tag: HtmlTagDescriptor, name: string): string => {
  const value = tag.attrs?.[name]
  return typeof value === 'string' ? value : ''
}

type StaticDir = { from: string; to: string }
const dirEntries = (list: (string | StaticDir)[]): StaticDir[] =>
  list.filter((d): d is StaticDir => typeof d !== 'string')

describe('preset.viteFinal and helpers', () => {
  test('viteFinal includes nodePolyfills and twing plugin when twigLib=twing', async () => {
    const config: UserConfig = { plugins: [] }
    const options: SDCAddonOptions = {
      sdcStorybookOptions: { twigLib: 'twing' },
    }

    const result = await viteFinal(config, options)

    const aliases = aliasesOf(result)
    expect(aliases.length).toBeGreaterThan(0)
    for (const a of aliases) {
      expect(typeof a.find).toBe('string')
      expect(String(a.find).startsWith('@')).toBe(true)
      expect(typeof a.replacement).toBe('string')
      expect(a.replacement.length).toBeGreaterThan(0)
    }

    expect(pluginNames(result)).toEqual(
      expect.arrayContaining(['nodePolyfills', 'twing-plugin'])
    )
  })

  test('viteFinal includes twig plugin when twigLib=twig', async () => {
    const config: UserConfig = { plugins: [] }
    const options: SDCAddonOptions = {
      sdcStorybookOptions: { twigLib: 'twig' },
    }

    const result = await viteFinal(config, options)
    expect(pluginNames(result)).toEqual(
      expect.arrayContaining(['nodePolyfills', 'twig-plugin'])
    )
  })

  test('viteFinal injects DEFAULT_DEPENDENCY_MAP as head tags', async () => {
    const result = await viteFinal({ plugins: [] }, { sdcStorybookOptions: {} })
    expect(pluginNames(result)).toContain('vite-plugin-sdc-head')
    const tags = dependencyHeadTags()
    expect(
      tags.some(
        (t) => t.tag === 'script' && attr(t, 'src').includes('drupal.js')
      )
    ).toBe(true)
    expect(
      tags.some(
        (t) => t.tag === 'link' && attr(t, 'href').includes('hidden.module.css')
      )
    ).toBe(true)
    expect(Object.keys(DEFAULT_DEPENDENCY_MAP).length).toBeGreaterThan(0)
  })

  test('dependencyHeadTags lets dependencyMap override a default library', () => {
    expect(
      dependencyHeadTags().some((t) => attr(t, 'src').includes('once'))
    ).toBe(true)
    const tags = dependencyHeadTags({ 'core/once': [] })
    expect(tags.every((t) => !attr(t, 'src').includes('once'))).toBe(true)
  })

  test('dependencyHeadTags emits each URL once', () => {
    const url = 'https://cdn.example/dup.js'
    const tags = dependencyHeadTags({
      'core/once': [{ type: 'js', url }],
      'core/drupal': [{ type: 'js', url }],
    })
    expect(tags.filter((t) => attr(t, 'src') === url)).toHaveLength(1)
  })

  test('experimental_indexers includes yamlStoriesIndexer', () => {
    const arr = indexersWithYaml(undefined)
    expect(arr.some((i) => i.test.test('file.component.yml'))).toBe(true)
    expect(arr.some((i) => typeof i.createIndex === 'function')).toBe(true)
  })

  test('staticDirs serves icon source directories (not namespace roots) under /sdc-icons/{ns}/', () => {
    const options: SDCAddonOptions = {
      sdcStorybookOptions: { namespace: 'umami' },
    }
    const result = dirEntries(staticDirs([], options))
    expect(result.length).toBeGreaterThan(0)
    expect(
      result.every(
        (d) => typeof d.from === 'string' && d.to.startsWith('/sdc-icons/')
      )
    ).toBe(true)
    const nsRoot = process.cwd()
    expect(result.every((d) => d.from !== nsRoot)).toBe(true)
  })

  test('staticDirs preserves existing entries', () => {
    const options: SDCAddonOptions = {
      sdcStorybookOptions: { namespace: 'umami' },
    }
    const existing = [{ from: '../components', to: '/components' }]
    const result = staticDirs(existing, options)
    expect(result).toContainEqual({ from: '../components', to: '/components' })
    expect(dirEntries(result).some((d) => d.to.startsWith('/sdc-icons/'))).toBe(
      true
    )
  })

  test('staticDirs: svg-only pack adds no static entries', () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-preset-svg-'))
    const ns = 'presetsvg'
    try {
      mkdirSync(join(tmpRoot, 'icons'))
      writeFileSync(join(tmpRoot, 'icons', 'a.svg'), '<svg><path/></svg>')
      writeFileSync(
        join(tmpRoot, `${ns}.icons.yml`),
        `pack:\n  extractor: svg\n  config:\n    sources:\n      - icons\n  template: ""\n`
      )
      const options: SDCAddonOptions = {
        sdcStorybookOptions: { namespaces: { [ns]: tmpRoot } },
      }
      const result = dirEntries(staticDirs([], options))
      expect(result.every((d) => !d.to.includes(ns))).toBe(true)
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('staticDirs: path extractor adds source directory', () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-preset-path-'))
    const ns = 'presetpath'
    try {
      mkdirSync(join(tmpRoot, 'img'))
      writeFileSync(join(tmpRoot, 'img', 'arrow.png'), 'PNG')
      writeFileSync(
        join(tmpRoot, `${ns}.icons.yml`),
        `pack:\n  extractor: path\n  config:\n    sources:\n      - img/*.png\n  template: ""\n`
      )
      const options: SDCAddonOptions = {
        sdcStorybookOptions: { namespaces: { [ns]: tmpRoot } },
      }
      const result = dirEntries(staticDirs([], options))
      const entry = result.find((d) => d.to.startsWith(`/sdc-icons/${ns}/`))
      expect(entry).toBeDefined()
      expect(entry?.from).toContain('img')
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('viteFinal preserves existing plugins and merges aliases', async () => {
    const existingPlugin: Plugin = { name: 'existing' }
    const config: UserConfig = {
      plugins: [existingPlugin],
      resolve: { alias: [] },
    }
    const options: SDCAddonOptions = {
      sdcStorybookOptions: { twigLib: 'twing' },
    }

    const result = await viteFinal(config, options)
    const names = pluginNames(result)

    expect(names).toContain('existing')
    expect(names).toEqual(
      expect.arrayContaining(['existing', 'nodePolyfills', 'twing-plugin'])
    )

    expect(
      aliasesOf(result).some(
        (a) => typeof a.find === 'string' && a.find.startsWith('@')
      )
    ).toBe(true)
  })
})
