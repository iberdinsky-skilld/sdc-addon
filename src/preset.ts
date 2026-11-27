import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import YamlStoriesPlugin from './vite/storybookYamlStories.ts'
import { yamlStoriesIndexer } from './vite/storyIndexer.ts'
import { mergeConfig } from 'vite'
import type { HtmlTagDescriptor, Plugin, UserConfig } from 'vite'
import type { Indexer } from 'storybook/internal/types'
import type { ExternalAsset, SDCAddonOptions } from './sdc.d.ts'
import { isRemoteUrl, mergeOptions } from './utils.ts'
import { toNamespaces, type NamespaceRoots } from './generate/namespaces.ts'
import { designTokensCss } from './generate/designTokens.ts'
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
  'vite-plugin-node-polyfills/shims/buffer',
  'vite-plugin-node-polyfills/shims/global',
  'vite-plugin-node-polyfills/shims/process',
  ...(twigLib === 'twing'
    ? ['twing', '@christianwiedemann/drupal-twig-extensions/twing']
    : ['twig', 'drupal-twig-extensions/twig']),
]

// `card.twig?raw` is the file's text, as for any other file; the Twing plugin
// would load it as a template.
export const twigRawPlugin = (): Plugin => ({
  name: 'vite-plugin-sdc-twig-raw',
  enforce: 'pre',
  load(id) {
    const [file, query] = id.split('?')
    if (!file?.endsWith('.twig') || !/^raw\b/.test(query ?? '')) return null
    return `export default ${JSON.stringify(readFileSync(file, 'utf8'))}`
  },
})

// Drupal libraries and design tokens; token files are re-read on each page load.
const sdcHeadPlugin = (
  headTags: HtmlTagDescriptor[],
  namespaces: NamespaceRoots
): Plugin => ({
  name: 'vite-plugin-sdc-head',
  transformIndexHtml: () => {
    const css = designTokensCss(namespaces)
    return css
      ? [...headTags, { tag: 'style', children: css, injectTo: 'head' }]
      : headTags
  },
  configureServer(server) {
    server.watcher.on('all', (_event, file) => {
      if (file.endsWith('.tokens.yml')) server.ws.send({ type: 'full-reload' })
    })
  },
})

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
    const { default: twing } = await import('vite-plugin-twing-drupal')
    twigPlugin = twing({
      ...vitePluginTwingDrupalOptions,
      namespaces: { ...namespaces.toTwingNamespaces() },
    })
  } else if (sdcStorybookOptions.twigLib === 'twig') {
    const { default: twig } = await import('vite-plugin-twig-drupal')
    twigPlugin = twig({
      ...vitePluginTwigDrupalOptions,
      namespaces: { ...namespaces.toTwigJsNamespaces() },
    })
  }

  const headTags = dependencyHeadTags(sdcStorybookOptions.dependencyMap)

  return mergeConfig(config, {
    plugins: [
      nodePolyfills({
        include: ['buffer', 'stream', 'path'],
      }),
      twigRawPlugin(),
      ...(twigPlugin ? [twigPlugin] : []),
      YamlStoriesPlugin({
        sdcStorybookOptions,
        jsonSchemaFakerOptions: options.jsonSchemaFakerOptions ?? {},
        globalDefs,
        namespaces,
      }),
      sdcTwigRuntimePlugin(namespaces, sdcStorybookOptions.resolveIconSource),
      sdcHeadPlugin(headTags, namespaces),
    ],
    optimizeDeps: {
      include: prebundledDeps(sdcStorybookOptions.twigLib),
      exclude: ['vite-plugin-twig-drupal', 'vite-plugin-twing-drupal'],
      esbuildOptions: { target: 'esnext' },
    },
    build: { target: 'esnext' },
    resolve: {
      alias: [
        ...namespaces.toViteAlias(),
        // One build, so the runtime's patches reach drupal-twig-extensions too.
        {
          find: /^drupal-attribute$/,
          replacement: fileURLToPath(import.meta.resolve('drupal-attribute')),
        },
      ],
    },
  })
}

export const indexersWithYaml = (
  existing?: Indexer[],
  validate?: string | boolean
): Indexer[] => [...(existing ?? []), yamlStoriesIndexer(validate)]

export const experimental_indexers = (
  existingIndexers: Indexer[] | undefined,
  options: SDCAddonOptions
): Indexer[] =>
  indexersWithYaml(
    existingIndexers,
    mergeOptions(DEFAULT_ADDON_OPTIONS, options).sdcStorybookOptions.validate
  )

type StaticDir = string | { from: string; to: string }

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
