import { existsSync, statSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import YamlStoriesPlugin, {
  yamlStoriesIndexer,
} from './vite-plugin-storybook-yaml-stories.ts'
import { mergeConfig } from 'vite'
import type { HtmlTagDescriptor, UserConfig } from 'vite'
import type { Indexer } from 'storybook/internal/types'
import type { StorybookConfig } from '@storybook/html-vite'
import type { SDCAddonOptions } from './sdc.d.ts'
import { toNamespaces } from './namespaces.ts'
import { loadAndMergeDefinitions } from './definitions.ts'
import { DEFAULT_ADDON_OPTIONS, DEFAULT_DEPENDENCY_MAP } from './constants.ts'
import { merge as lodashMerge } from 'lodash-es'
import { sdcTwigRuntimePlugin } from './vite-plugin-sdc-twig-runtime.ts'
import { loadIconPackFile } from './icon-packs.ts'

// Main function to merge Vite configuration
export async function viteFinal(config: UserConfig, options: SDCAddonOptions) {
  options = lodashMerge({}, DEFAULT_ADDON_OPTIONS, options)

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
    // @ts-ignore — no type declarations for this package
    const { default: twing } = await import('vite-plugin-twing-drupal')
    twigPlugin = twing(options.vitePluginTwingDrupalOptions)
  } else if (sdcStorybookOptions.twigLib === 'twig') {
    options.vitePluginTwigDrupalOptions = {
      ...vitePluginTwigDrupalOptions,
      namespaces: { ...namespaces.toTwigJsNamespaces() },
    }
    // @ts-ignore — no type declarations for this package
    const { default: twig } = await import('vite-plugin-twig-drupal')
    twigPlugin = twig(options.vitePluginTwigDrupalOptions)
  }

  const userMap = sdcStorybookOptions.dependencyMap ?? {}
  const effectiveMap = { ...DEFAULT_DEPENDENCY_MAP, ...userMap }

  const seen = new Set<string>()
  const headTags: HtmlTagDescriptor[] = Object.keys(DEFAULT_DEPENDENCY_MAP)
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
      exclude: ['vite-plugin-twig-drupal', 'vite-plugin-twing-drupal'],
      esbuildOptions: { target: 'esnext' },
    },
    build: { target: 'esnext' },
    resolve: {
      alias: [...namespaces.toViteAlias()],
    },
  })
}

// Optional: Indexer support
export const experimental_indexers: StorybookConfig['experimental_indexers'] =
  async (existingIndexers: Indexer[] | undefined) => [
    ...(existingIndexers || []),
    yamlStoriesIndexer,
  ]

export const staticDirs = async (
  existing: (string | { from: string; to: string })[],
  options: SDCAddonOptions
) => {
  const merged = lodashMerge({}, DEFAULT_ADDON_OPTIONS, options)
  const namespaces = toNamespaces(merged.sdcStorybookOptions)

  const iconDirs: { from: string; to: string }[] = []

  for (const [ns, nsRoot] of namespaces.entries()) {
    const iconsFile = join(nsRoot, `${ns}.icons.yml`)
    if (!existsSync(iconsFile)) continue

    const { packs } = loadIconPackFile(iconsFile)
    const seen = new Set<string>()

    for (const pack of Object.values(packs)) {
      if (pack.extractor === 'svg') continue

      for (const src of pack.sources) {
        if (src.startsWith('http')) continue
        if (!existsSync(src)) continue

        const dir = statSync(src).isDirectory() ? src : dirname(src)
        if (seen.has(dir)) continue
        seen.add(dir)

        const relDir = relative(nsRoot, dir).replace(/\\/g, '/')
        iconDirs.push({ from: dir, to: `/sdc-icons/${ns}/${relDir}` })
      }
    }
  }

  return [...(existing || []), ...iconDirs]
}
