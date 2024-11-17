import YamlStoriesPlugin, {
  yamlStoriesIndexer,
} from './vite-plugin-storybook-yaml-stories'
import twig from 'vite-plugin-twig-drupal'
import { UserConfig, mergeConfig } from 'vite'
import { Indexer } from '@storybook/types'
import { resolve } from 'path'
import { existsSync } from 'fs'
import glob from 'glob'
import type { StorybookConfig } from '@storybook/html-vite'
import { SDCStorybookOptions } from './addon'
import { JSONSchemaFakerOptions } from 'json-schema-faker'

let cachedComponentDirectories: string[] | null = null

const getComponentDirectories = (): string[] => {
  if (cachedComponentDirectories === null) {
    cachedComponentDirectories = glob.sync('./components/**/*.component.yml')
  }
  return cachedComponentDirectories
}

// Function to resolve component paths dynamically
export const resolveComponentPath = (namespace: string, component: string) => {
  const componentDirectories = getComponentDirectories()
  const possiblePaths = componentDirectories.map((dir) =>
    resolve(`${dir}/${component}/${component}.component.yml`)
  )

  // Return the first existing path
  return possiblePaths.find((path) => existsSync(path))
}

// The main function that merges configuration and sets up the namespace alias
export function viteFinal(
  config: UserConfig,
  options: {
    sdcStorybookOptions: SDCStorybookOptions
    vitePluginTwigDrupalOptions: {
      namespaces?: {}
      functions?: {}
      globalContext: {}
    }
    jsonSchemaFakerOptions: JSONSchemaFakerOptions
  }
) {
  const { namespace } = options.sdcStorybookOptions

  return mergeConfig(config, {
    plugins: [
      twig(options.vitePluginTwigDrupalOptions),
      YamlStoriesPlugin({ ...options }),
    ],
    resolve: {
      alias: [
        {
          find: new RegExp(`${namespace}:(.*)`), // Use namespace from options
          replacement: (match: string, component: string) => {
            const resolvedPath = resolveComponentPath(namespace, component)
            if (!resolvedPath) {
              throw new Error(`Component ${component} could not be resolved.`)
            }
            return resolvedPath
          },
        },
      ],
    },
  })
}

// Optional: indexer support
export const experimental_indexers: StorybookConfig['experimental_indexers'] =
  async (existingIndexers: Indexer[] | undefined) => [
    ...(existingIndexers || []),
    yamlStoriesIndexer,
  ]

// Optional: Add the previewHead, including necessary styles and scripts for Drupal components
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
  <script src="https://unpkg.com/@drupal/once"></script>
  ${head}
`
