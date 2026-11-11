import { existsSync, statSync } from 'node:fs'
import { dirname, relative } from 'node:path'
import YamlStoriesPlugin from './vite/storybookYamlStories.ts'
import { yamlStoriesIndexer } from './vite/storyIndexer.ts'
import { mergeConfig } from 'vite'
import type { HtmlTagDescriptor, UserConfig } from 'vite'
import type { Indexer } from 'storybook/internal/types'
import type { StorybookConfig } from '@storybook/html-vite'
import type { ExternalAsset, SDCAddonOptions } from './sdc.d.ts'
import { isRemoteUrl, mergeOptions } from './utils.ts'
import { toNamespaces } from './generate/namespaces.ts'
import { loadAndMergeDefinitions } from './generate/definitions.ts'
import { DEFAULT_ADDON_OPTIONS, DEFAULT_DEPENDENCY_MAP } from './constants.ts'
import { sdcTwigRuntimePlugin } from './vite/sdcTwigRuntime.ts'
import { iconPackFiles, loadIconPackFile } from './generate/iconPacks.ts'

// Head tags for the core Drupal libraries, `dependencyMap` overriding them.
// Each URL is emitted once.
export const dependencyHeadTags = (
  dependencyMap: Record<string, ExternalAsset[]> = {}
): HtmlTagDescriptor[] => {
  const effectiveMap = { ...DEFAULT_DEPENDENCY_MAP, ...dependencyMap }
  const seen = new Set<string>()
  return Object.keys(DEFAULT_DEPENDENCY_MAP)
    .flatMap((k) => effectiveMap[k] ?? [])
    .filter((asset) => (seen.has(asset.url) ? false : seen.add(asset.url)))
    .map((asset) =>
      asset.type === 'css'
        ? {
            tag: 'link' as const,
            attrs: {
              rel: 'stylesheet',
              href: asset.url,
              ...(asset.media ? { media: asset.media } : {}),
            },
            injectTo: 'head' as const,
          }
        : {
            tag: 'script' as const,
            attrs: { src: asset.url },
            injectTo: 'head' as const,
          }
    )
}

// Found only when the first story loads, they make Vite reload the page mid-load.
export const prebundledDeps = (twigLib?: 'twig' | 'twing'): string[] => [
  'drupal-attribute',
  'class-variance-authority',
  'vite-plugin-node-polyfills/shims/buffer',
  'vite-plugin-node-polyfills/shims/global',
  'vite-plugin-node-polyfills/shims/process',
  ...(twigLib === 'twing'
    ? ['twing', '@christianwiedemann/drupal-twig-extensions/twing']
    : ['twig', 'drupal-twig-extensions/twig']),
]

export async function viteFinal(
  config: UserConfig,
  userOptions: SDCAddonOptions
): Promise<UserConfig> {
  const options = mergeOptions(DEFAULT_ADDON_OPTIONS, userOptions)

  const {
    sdcStorybookOptions,
    vitePluginTwigDrupalOptions,
    vitePluginTwingDrupalOptions,
  } = options
  const { customDefs, externalDefs } = sdcStorybookOptions

  const { nodePolyfills } = await import('vite-plugin-node-polyfills')

  const globalDefs = await loadAndMergeDefinitions(externalDefs, customDefs)
  const namespaces = toNamespaces(sdcStorybookOptions)

  let twigPlugin = null

  if (sdcStorybookOptions.twigLib === 'twing') {
    options.vitePluginTwingDrupalOptions = {
      ...vitePluginTwingDrupalOptions,
      namespaces: { ...namespaces.toTwingNamespaces() },
    }
    const { default: twing } = await import('vite-plugin-twing-drupal')
    twigPlugin = twing(options.vitePluginTwingDrupalOptions)
  } else if (sdcStorybookOptions.twigLib === 'twig') {
    options.vitePluginTwigDrupalOptions = {
      ...vitePluginTwigDrupalOptions,
      namespaces: { ...namespaces.toTwigJsNamespaces() },
    }
    const { default: twig } = await import('vite-plugin-twig-drupal')
    twigPlugin = twig(options.vitePluginTwigDrupalOptions)
  }

  const headTags = dependencyHeadTags(sdcStorybookOptions.dependencyMap)

  return mergeConfig(config, {
    plugins: [
      nodePolyfills({
        include: ['buffer', 'stream', 'path'],
      }),
      ...(twigPlugin ? [twigPlugin] : []),
      YamlStoriesPlugin({ ...options, globalDefs, namespaces }),
      sdcTwigRuntimePlugin(namespaces, sdcStorybookOptions.resolveIconSource),
      ...(headTags.length > 0
        ? [{ name: 'vite-plugin-sdc-head', transformIndexHtml: () => headTags }]
        : []),
    ],
    optimizeDeps: {
      include: prebundledDeps(sdcStorybookOptions.twigLib),
      exclude: ['vite-plugin-twig-drupal', 'vite-plugin-twing-drupal'],
      esbuildOptions: { target: 'esnext' },
    },
    build: { target: 'esnext' },
    resolve: {
      alias: [...namespaces.toViteAlias()],
    },
  })
}

export const indexersWithYaml = (existing?: Indexer[]): Indexer[] => [
  ...(existing ?? []),
  yamlStoriesIndexer,
]

export const experimental_indexers: StorybookConfig['experimental_indexers'] = (
  existingIndexers
) => indexersWithYaml(existingIndexers)

type StaticDir = string | { from: string; to: string }

// `undefined` when the project has no staticDirs.
export const staticDirs = (
  existing: StaticDir[] | undefined,
  options: SDCAddonOptions
): StaticDir[] => {
  const merged = mergeOptions(DEFAULT_ADDON_OPTIONS, options)
  const namespaces = toNamespaces(merged.sdcStorybookOptions)

  const iconDirs: { from: string; to: string }[] = []

  for (const [ns, iconsFile] of iconPackFiles(namespaces)) {
    const nsRoot = dirname(iconsFile)
    const { packs } = loadIconPackFile(iconsFile)
    const seen = new Set<string>()

    for (const pack of Object.values(packs)) {
      if (pack.extractor === 'svg') continue

      for (const src of pack.sources) {
        if (isRemoteUrl(src) || !existsSync(src)) continue

        const dir = statSync(src).isDirectory() ? src : dirname(src)
        if (seen.has(dir)) continue
        seen.add(dir)

        const relDir = relative(nsRoot, dir).replace(/\\/g, '/')
        iconDirs.push({ from: dir, to: `/sdc-icons/${ns}/${relDir}` })
      }
    }
  }

  return [...(existing ?? []), ...iconDirs]
}
