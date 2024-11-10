import YamlStoriesPlugin, {
  yamlStoriesIndexer,
} from './vite-plugin-storybook-yaml-stories'
import twig from 'vite-plugin-twig-drupal'
import { UserConfig, mergeConfig } from 'vite'
import { Indexer } from '@storybook/types'
import { resolve, join } from 'path'
import fs from 'fs'

// Function to dynamically get all subdirectories of a given directory
const getSubdirectories = (baseDir: string): string[] => {
  return fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => join(baseDir, dirent.name))
}

// Function to dynamically generate the list of component directories
const getComponentDirectories = (): string[] => {
  const baseComponentDir = resolve('./components') // Base directory for components
  const subdirectories = getSubdirectories(baseComponentDir)

  // Return the base directory and all its subdirectories (recursively, if needed)
  return [baseComponentDir, ...subdirectories]
}

// Function to resolve component paths dynamically
export const resolveComponentPath = (namespace: string, component: string) => {
  const componentDirectories = getComponentDirectories() // Get dynamic directories
  const possiblePaths = componentDirectories.map((dir) =>
    resolve(`${dir}/${component}/${component}.component.yml`)
  )

  // Return the first existing path
  return possiblePaths.find((path) => fs.existsSync(path))
}

// The main function that merges configuration and sets up the namespace alias
export function viteFinal(
  config: UserConfig,
  options: {
    sdcStorybookOptions: {
      namespace: string // Use this for namespace-based resolution
    }
    vitePluginTwigDrupalOptions: {}
    jsonSchemaFakerOptions: {}
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
export const experimental_indexers = async (
  existingIndexers: Indexer[] | undefined
) => [...(existingIndexers || []), yamlStoriesIndexer]

// Optional: Add the previewHead, including necessary styles and scripts for Drupal components
export const previewHead = (head: any) => `
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

export const staticDirs = [{ from: '../components', to: '/components' }];