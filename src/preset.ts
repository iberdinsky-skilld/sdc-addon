import YamlStoriesPlugin, {
  yamlStoriesIndexer,
} from './vite-plugin-storybook-yaml-stories.ts'
import twig from 'vite-plugin-twing-drupal'
import { mergeConfig } from 'vite'
import type { UserConfig } from 'vite'
import type { Indexer } from 'storybook/internal/types'
import { resolve } from 'path'
import { existsSync, readFileSync } from 'node:fs'
import { parse } from 'yaml'
import { sync } from 'glob'
import type { StorybookConfig } from '@storybook/html-vite'
import type { SDCStorybookOptions } from './sdc'
import { type JSONSchemaFakerOptions } from 'json-schema-faker'
import type { JSONSchema4 } from 'json-schema'
import fetch from 'node-fetch'
import { logger } from './logger.ts'

// Load external definitions (local or remote)
async function loadExternalDef(defPath: string): Promise<Record<string, any>> {
  try {
    if (defPath.startsWith('http://') || defPath.startsWith('https://')) {
      const response = await fetch(defPath)
      if (!response.ok) {
        throw new Error(`Failed to fetch ${defPath}: ${response.statusText}`)
      }
      const content = await response.text()
      return parse(content)
    } else {
      const content = readFileSync(defPath, 'utf8')
      return parse(content)
    }
  } catch (error) {
    logger.error(`Error loading external definition from ${defPath}: ${error}`)
    throw error
  }
}

// Isolated utility to fetch component directories
function getComponentDirectories(): string[] {
  return sync('./components/**/*.component.yml')
}

// Resolve component paths dynamically
function resolveComponentPath(
  namespace: string,
  component: string
): string | undefined {
  const componentDirectories = getComponentDirectories()
  const possiblePaths = componentDirectories.map((dir) =>
    resolve(`${dir}/${component}/${component}.component.yml`)
  )

  const resolvedPath = possiblePaths.find((path) => existsSync(path))
  if (!resolvedPath) {
    logger.error(
      `Component ${component} could not be resolved in namespace ${namespace}`
    )
  }
  return resolvedPath
}

// Default options for SDC Storybook
const defaultOptions: SDCStorybookOptions = {
  validate: false,
  // validate:
  //   'https://git.drupalcode.org/project/drupal/-/raw/HEAD/core/assets/schemas/v1/metadata.schema.json',
}

// Helper to load and merge definitions
async function loadAndMergeDefinitions(
  externalDefs: string[] | undefined,
  customDefs: Record<string, any> | undefined
): Promise<JSONSchema4> {
  const globalDefs: JSONSchema4 = {}

  // Load external definitions
  if (externalDefs) {
    await Promise.all(
      externalDefs.map(async (defPath) => {
        const def = await loadExternalDef(defPath)
        Object.entries(def).forEach(([component, schema]) => {
          globalDefs[component] = schema
        })
      })
    )
  }

  // Merge custom definitions
  if (customDefs) {
    Object.entries(customDefs).forEach(([component, schema]) => {
      globalDefs[component] = schema
    })
  }

  if (Object.keys(globalDefs).length > 0) {
    logger.info(
      `Registering custom definitions: ${Object.keys(globalDefs).join(', ')}`
    )
  }

  return globalDefs
}

// Main function to merge Vite configuration
export async function viteFinal(
  config: UserConfig,
  options: {
    sdcStorybookOptions: SDCStorybookOptions
    twigLib: 'twing',
    vitePluginTwingDrupalOptions: {
      namespaces?: {}
      include: '/\.twig(\?.*)?$/'
      hooks?: ''
    }
    vitePluginTwigDrupalOptions: {
      namespaces?: {}
      functions?: {}
      globalContext: {}
    }
    jsonSchemaFakerOptions: JSONSchemaFakerOptions
  }
) {
  options.sdcStorybookOptions = {
    ...defaultOptions,
    ...options.sdcStorybookOptions,
  }

  const { namespace, customDefs, externalDefs } = options.sdcStorybookOptions
  const globalDefs = await loadAndMergeDefinitions(externalDefs, customDefs)
  const { nodePolyfills } = await import('vite-plugin-node-polyfills');

  return mergeConfig(config, {
    plugins: [
      nodePolyfills({
        include: ['buffer', 'stream', 'util', 'events', 'path'],
      }),
      twig(options.vitePluginTwingDrupalOptions),
      //twig(options.vitePluginTwigDrupalOptions),
      YamlStoriesPlugin({ ...options, globalDefs }),
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
