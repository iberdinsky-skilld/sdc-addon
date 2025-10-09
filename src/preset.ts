import YamlStoriesPlugin, {
  yamlStoriesIndexer,
} from './vite-plugin-storybook-yaml-stories.ts'
import { mergeConfig } from 'vite'
import type { UserConfig } from 'vite'
import type { Indexer } from 'storybook/internal/types'
import type { StorybookConfig } from '@storybook/html-vite'
import type { SDCAddonOptions } from './sdc.d.ts'
import { toNamespaces } from './namespaces.ts'
import { loadAndMergeDefinitions } from './definitions.ts'
import { DEFAULT_ADDON_OPTIONS } from './constants.ts'

// Main function to merge Vite configuration
export async function viteFinal(config: UserConfig, options: SDCAddonOptions) {
  options = {
    ...DEFAULT_ADDON_OPTIONS,
    ...options,
  }

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

  return mergeConfig(config, {
    plugins: [
      nodePolyfills({
        include: ['buffer', 'stream', 'path'],
      }),
      ...(twigPlugin ? [twigPlugin] : []),
      YamlStoriesPlugin({ ...options, globalDefs, namespaces }),
    ],
    optimizeDeps: {
      exclude: ['vite-plugin-twig-drupal', 'vite-plugin-twing-drupal'],
    },
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

// Optional: Add the previewHead
export const previewHead: StorybookConfig['previewHead'] = (head: string) => `
  <style>
    .visually-hidden {
      position: absolute !important;
      overflow: hidden;
      clip: rect(1px, 1px, 1px, 1px);
      width: 1px;
      height: 1px;
      word-wrap: normal;
    }
  </style>
  <script src="https://cdn.jsdelivr.net/gh/drupal/drupal/core/misc/drupalSettingsLoader.js"></script>
  <script src="https://cdn.jsdelivr.net/gh/drupal/drupal/core/misc/drupal.js"></script>
  <script src="https://cdn.jsdelivr.net/gh/drupal/drupal/core/misc/drupal.init.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@drupal/once@1.0.1/dist/once.min.js"></script>
  ${head}
`
