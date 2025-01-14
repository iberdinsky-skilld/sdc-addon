import YamlStoriesPlugin, {
  yamlStoriesIndexer,
} from './vite-plugin-storybook-yaml-stories'
import twig from 'vite-plugin-twig-drupal'
import { UserConfig, mergeConfig } from 'vite'
import { Indexer } from '@storybook/types'
import { resolve } from 'path'
import { existsSync, readFileSync } from 'node:fs'
import { parse } from 'yaml'
import glob from 'glob'
import type { StorybookConfig } from '@storybook/html-vite'
import { SDCStorybookOptions } from './sdc'
import { JSONSchemaFakerOptions } from 'json-schema-faker'
import { JSONSchema4 } from 'json-schema'
import fetch from 'node-fetch'
import { logger } from './logger'

// Load external definitions (local or remote)
async function loadExternalDef(defPath: string): Promise<Record<string, any>> {
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
}

// Isolated utility to fetch component directories
function getComponentDirectories(): string[] {
  return glob.sync('./components/**/*.component.yml')
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
  validate:
    'https://git.drupalcode.org/project/drupal/-/raw/HEAD/core/assets/schemas/v1/metadata.schema.json',
}

// Main function to merge Vite configuration
export async function viteFinal(
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
  options.sdcStorybookOptions = {
    ...defaultOptions,
    ...options.sdcStorybookOptions,
  }

  const { namespace, customDefs, externalDefs, validate } =
    options.sdcStorybookOptions
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

  return mergeConfig(config, {
    plugins: [
      twig(options.vitePluginTwigDrupalOptions),
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
  <script src="https://unpkg.com/@drupal/once"></script>
  ${head}
`
