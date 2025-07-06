import { readdirSync, readFileSync } from 'fs'
import { parse as parseYaml } from 'yaml'
import { join, basename, dirname, extname } from 'path'
import { globSync } from 'glob'

import type { Args, ArgTypes, Indexer, IndexInput } from 'storybook/internal/types'
import argsGenerator from './argsGenerator.ts'
import argTypesGenerator from './argTypesGenerator.ts'
import storiesGenerator from './storiesGenerator.ts'
import componentMetadata from './componentMetadata.ts'
import type { Component, SDCSchema, SDCStorybookOptions } from './sdc'
import { type JSONSchemaFakerOptions } from 'json-schema-faker'
import type { JSONSchema4 } from 'json-schema'
import { validateJson } from './validateJson.ts'
import { convertToKebabCase, resolveComponentPath } from './utils'

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
const generateImports = (directory: string): string =>
  readdirSync(directory)
    .filter((file) =>
      ['.css', '.js', '.mjs', '.twig', '.yml'].includes(extname(file))
    )
    .map((file) => {
      const filePath = `./${file}`
      return extname(file) === '.twig'
        ? `import COMPONENT from '${filePath}';`
        : `import '${filePath}';`
    })
    .join('\n')

// Dynamically generate component imports from story configurations
const dynamicImports = (stories: Component[]): string => {
  const imports = new Set<string>()

  const extractComponentImports = (args: Record<string, any>) => {
    Object.values(args).forEach((value) => {
      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (item.type === 'component') {
            const [namespace, componentName] = item.component.split(':')
            const resolvedPath = resolveComponentPath(namespace, componentName)
            const kebabCaseName = convertToKebabCase(item.component)
            if (resolvedPath) {
              imports.add(
                `import * as ${kebabCaseName} from '${resolvedPath}';`
              )
            }
          }
        })
      } else if (value && typeof value === 'object') {
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
  stories: Record<string, any>
): IndexInput[] => {
  const storiesIndex: IndexInput[] = [
    {
      type: 'story',
      importPath: fileName,
      exportName: 'Basic',
      title: baseTitle,
    },
  ]

  if (stories) {
    Object.keys(stories).forEach((storyKey) => {
      storiesIndex.push({
        type: 'story',
        importPath: fileName,
        exportName: storyKey,
        title: baseTitle,
      })
    })
  }

  return storiesIndex
}

// Vite plugin to process YAML component files
export default ({
  jsonSchemaFakerOptions = {} as JSONSchemaFakerOptions,
  sdcStorybookOptions = {} as SDCStorybookOptions,
  globalDefs = {} as JSONSchema4,
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
      const imports = generateImports(dirname(id))
      const previewsStories = {
        ...(content.thirdPartySettings?.sdcStorybook?.stories || {}),
        ...loadStoryFilesSync(id),
      }

      const storiesImports = dynamicImports(previewsStories)
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
            `${sdcStorybookOptions?.namespace}:${basename(id, '.component.yml')}`,
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

export default {
  component: COMPONENT,
  argTypes: ${JSON.stringify(argTypes, null, 2)},
  args: ${JSON.stringify(args, null, 2)},
};

export const Basic = {
  args: ${JSON.stringify(basicArgs, null, 2)},
  play: async ({ canvasElement }) => {
    Drupal.attachBehaviors(canvasElement, window.drupalSettings);
  },
};

${stories}
      `
    } catch (error) {
      console.error(`Error loading component YAML file: ${id}`, error)
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
      const baseTitle = makeTitle(`SDC/${content.name}`)
      const stories = content.thirdPartySettings?.sdcStorybook?.stories
      const storiesContent = loadStoryFilesSync(fileName)
      const mergedStories = { ...stories, ...storiesContent }
      return createStoryIndex(fileName, baseTitle, mergedStories)
    } catch (error) {
      console.error(`Error creating index for YAML file: ${fileName}`, error)
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
