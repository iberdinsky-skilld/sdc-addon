import { readdirSync, readFileSync } from 'fs'
import { parse as parseYaml } from 'yaml'
import { join, basename, dirname, extname, relative, sep } from 'path'
import { globSync } from 'glob'
import { logger } from './logger.ts'

import type {
  Args,
  ArgTypes,
  Indexer,
  IndexInput,
} from 'storybook/internal/types'
import argsGenerator from './argsGenerator.ts'
import argTypesGenerator from './argTypesGenerator.ts'
import storiesGenerator from './storiesGenerator.ts'
import { storyNodeRenderer } from './storyNodeRender.ts'
import componentMetadata from './componentMetadata.ts'
import type { Component, SDCSchema, SDCStorybookOptions } from './sdc.d.ts'
import type { JSONSchemaFakerOptions } from 'json-schema-faker'
import type { JSONSchema4 } from 'json-schema'
import { validateJson } from './validateJson.ts'
import { capitalize, convertToKebabCase, deriveGroupFromPath } from './utils.ts'
import {
  Namespaces,
  getProjectName,
  resolveComponentPath,
} from './namespaces.ts'

// Helper to read and validate SDC YAML files
const readSDC = (
  filePath: string,
  defs?: JSONSchema4,
  validate?: string | boolean
): SDCSchema => {
  const sdcSchema = {
    $defs: defs,
    ...(parseYaml(readFileSync(filePath, 'utf8')) as SDCSchema),
  }
  if (typeof validate === 'string' && validate.length > 0) {
    validateJson(sdcSchema, sdcSchema['$schema'] || validate)
  }
  return sdcSchema
}

// Generate import statements for all assets in a directory
const generateImports = (directory: string, namespaces: Namespaces): string =>
  readdirSync(directory)
    .filter((file) =>
      ['.css', '.js', '.mjs', '.twig', '.yml'].includes(extname(file))
    )
    .map((file) => {
      const filePath = `./${file}`
      const namespace = namespaces.pathToNamespace(directory)
      logger.info(`IMPORT ASSET ${directory}/${file}`)
      return extname(file) === '.twig'
        ? `import COMPONENT from '${namespace}/${file}';`
        : `import '${filePath}';`
    })
    .join('\n')

// Dynamically generate component imports from story configurations
const dynamicImports = (
  stories: Component[],
  namespaces: Namespaces
): string => {
  const imports = new Set<string>()

  const importComponent = (item: Component) => {
    const [namespace, componentName] = item.component.split(':')
    const resolvedPath = resolveComponentPath(
      namespace,
      componentName,
      namespaces
    )
    const kebabCaseName = convertToKebabCase(item.component)
    if (resolvedPath) {
      imports.add(`import * as ${kebabCaseName} from '${resolvedPath}';`)
    }
  }
  const extractComponentImports = (args: Record<string, any>) => {
    Object.values(args).forEach((value) => {
      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (item.type === 'component') {
            importComponent(item)
          }
          extractComponentImports(value)
        })
      } else if (value && typeof value === 'object') {
        if (value.type === 'component') {
          importComponent(value)
        }
        extractComponentImports(value)
      }
    })
  }

  Object.values(stories).forEach(({ slots = {}, props = {} }) =>
    extractComponentImports({ ...slots, ...props })
  )
  return Array.from(imports).join('\n')
}

// Helper to create story index
const createStoryIndex = (
  fileName: string,
  baseTitle: string,
  stories: Record<string, any>,
  disabledStories: string[],
  tags: string[]
): IndexInput[] => {
  const storiesIndex: IndexInput[] = []
  
  // Check if all stories are disabled
  const isAllDisabled = disabledStories.includes('all')
  
  // Add Basic story if not disabled
  if (!isAllDisabled && !disabledStories.includes('basic')) {
    storiesIndex.push({
      type: 'story',
      importPath: fileName,
      exportName: 'Basic',
      title: baseTitle,
      tags,
    })
  }

  // Add custom stories if not all disabled
  if (stories && !isAllDisabled) {
    Object.keys(stories).forEach((storyKey) => {
      // Skip if this specific story is disabled
      if (!disabledStories.includes(storyKey)) {
        storiesIndex.push({
          type: 'story',
          importPath: fileName,
          exportName: storyKey,
          title: baseTitle,
          tags,
        })
      }
    })
  }

  return storiesIndex
}

// Vite plugin to process YAML component files
export default ({
  jsonSchemaFakerOptions = {} as JSONSchemaFakerOptions,
  sdcStorybookOptions = {} as SDCStorybookOptions,
  globalDefs = {} as JSONSchema4,
  namespaces = {} as Namespaces,
}) => ({
  name: 'vite-plugin-storybook-yaml-stories',
  async load(id: string) {
    if (id.endsWith('story.yml')) {
      // We need to load the story.yml to support reload.
      // But we ignore to load them.
      return ''
    }

    if (!id.endsWith('component.yml')) return

    try {
      const content = readSDC(id, globalDefs, sdcStorybookOptions.validate)
      const imports = generateImports(dirname(id), namespaces)
      const previewsStories = {
        ...(content.thirdPartySettings?.sdcStorybook?.stories || {}),
        ...loadStoryFilesSync(id),
      }
      storyNodeRenderer.register(sdcStorybookOptions.storyNodesRenderer ?? [])

      const storiesImports = dynamicImports(previewsStories, namespaces)
      const metadata = componentMetadata(id, content)

      const argTypes: ArgTypes = {
        componentMetadata: { table: { disable: true } },
        defaultAttributes: { table: { disable: true } },
        ...(content.variants && {
          variant: {
            control: 'select',
            options: Object.keys(content.variants),
          },
        }),
        ...argTypesGenerator(content),
      }

      const args: Args = {
        defaultAttributes: [
          [
            'data-component-id',
            `${namespaces.pathToNamespace(dirname(id), true)}`,
          ],
        ],
        componentMetadata: metadata,
        ...(content.variants && {
          variant: Object.keys(content.variants)[0],
        }),
        ...argsGenerator(content, jsonSchemaFakerOptions),
      }

      const basicArgs = { ...args }

      const stories = previewsStories ? storiesGenerator(previewsStories) : ''

      return `
${imports}
${storiesImports}

class TwigSafeArray extends Array {
  toString() {
    return this.join('');
  }
}

export default {
  component: COMPONENT,
  parameters:  {...${JSON.stringify(content?.thirdPartySettings?.sdcStorybook?.parameters ?? {}, null, 2)}, ...{docs: {description: {component: ${JSON.stringify(content.description, null, 2)}}}}},
  argTypes: ${JSON.stringify(argTypes, null, 2)},
  args: ${JSON.stringify(args, null, 2)},
};

export const Basic = {
  
  args: ${JSON.stringify(basicArgs, null, 2)},
  baseArgs: ${JSON.stringify(args, null, 2)}, 
  play: async ({ canvasElement }) => {
    Drupal.attachBehaviors(canvasElement, window.drupalSettings);
  },
};
${stories}
      `
    } catch (error) {
      logger.error(`Error loading component YAML file: ${id}, ${error}`)
      throw error
    }
  },
})

// Indexer for YAML-based Storybook stories
export const yamlStoriesIndexer: Indexer = {
  test: /component\.yml$/,
  createIndex: async (fileName, { makeTitle }) => {
    try {
      const content = readSDC(fileName)

      // Group set via metadata wins; else derive from path; else 'SDC'
      const group = content.group || deriveGroupFromPath(fileName)

      const baseTitle = makeTitle(
        `${getProjectName(fileName)}/${capitalize(group)}/${content.name}`
      )

      const stories = content.thirdPartySettings?.sdcStorybook?.stories
      const storiesContent = loadStoryFilesSync(fileName)
      const mergedStories = { ...stories, ...storiesContent }
      const tags = content?.thirdPartySettings?.sdcStorybook?.tags ?? []
      
      // Handle both old and new configuration formats
      const oldDisableBasicStory = content.thirdPartySettings?.sdcStorybook?.disableBasicStory
      const newDisabledStories = content.thirdPartySettings?.sdcStorybook?.disabledStories
      
      let disabledStories: string[] = []
      
      // Backward compatibility: convert old boolean to new array format
      if (oldDisableBasicStory === true) {
        disabledStories = ['basic']
      } else if (newDisabledStories) {
        disabledStories = newDisabledStories
      }
      
      return createStoryIndex(
        fileName,
        baseTitle,
        mergedStories,
        disabledStories,
        tags
      )
    } catch (error) {
      logger.error(`Error creating index for YAML file: ${fileName}, ${error}`)
      throw error
    }
  },
}

// Load *.story.yml files.
const loadStoryFilesSync = (fileName: string) => {
  const folderPath = dirname(fileName)
  const storyFiles = globSync(join(folderPath, '*.story.yml'))

  return storyFiles.reduce(
    (acc, file) => {
      const content = readFileSync(file, 'utf8')
      const key = basename(file).split('.')[1]
      return {
        ...acc,
        [key]: parseYaml(content),
      }
    },
    {} as Record<string, any>
  )
}
