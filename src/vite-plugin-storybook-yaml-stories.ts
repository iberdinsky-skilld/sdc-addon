import { readdirSync, readFileSync, existsSync } from 'fs'
import { parse as parseYaml } from 'yaml'
import { basename, dirname, extname, join, resolve } from 'path'
import type { Args, ArgTypes, Indexer, IndexInput } from '@storybook/types'
import argsGenerator from './argsGenerator.ts'
import argTypesGenerator from './argTypesGenerator.ts'
import storiesGenerator from './storiesGenerator.ts'
import componentMetadata from './componentMetadata.ts'
import type { Component, SDCSchema, SDCStorybookOptions } from './sdc'
import { type JSONSchemaFakerOptions } from 'json-schema-faker'
import type { JSONSchema4 } from 'json-schema'
import { validateJson } from './validateJson.ts'
import { logger } from './logger.ts'

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

// Get all subdirectories in a given base directory
const getSubdirectories = (baseDir: string): string[] =>
  readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(baseDir, entry.name))

// Resolve the file path to a component YAML definition
const resolveComponentPath = (
  namespace: string,
  component: string
): string | undefined => {
  const baseDir = resolve('./components')
  const directories = [baseDir, ...getSubdirectories(baseDir)]
  const possiblePaths = directories.map((dir) =>
    join(dir, component, `${component}.component.yml`)
  )
  return possiblePaths.find(existsSync)
}

// Generate import statements for all assets in a directory
const generateImports = (directory: string): string =>
  readdirSync(directory)
    .filter((file) => ['.css', '.js', '.mjs', '.twig'].includes(extname(file)))
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
            const kebabCaseName = item.component.replace(/[-:]/g, '')
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

// Vite plugin to process YAML component files
export default ({
  jsonSchemaFakerOptions = {} as JSONSchemaFakerOptions,
  sdcStorybookOptions = {} as SDCStorybookOptions,
  globalDefs = {} as JSONSchema4,
}) => ({
  name: 'vite-plugin-storybook-yaml-stories',
  async load(id: string) {
    if (!id.endsWith('component.yml')) return

    const content = readSDC(id, globalDefs, sdcStorybookOptions.validate)
    const imports = generateImports(dirname(id))
    const storiesImports = dynamicImports(
      content.thirdPartySettings?.sdcStorybook?.stories || {}
    )
    const metadata = componentMetadata(id, content)

    const argTypes: ArgTypes = {
      componentMetadata: { table: { disable: true } },
      ...(content.variants && {
        variant: {
          control: 'select',
          options: Object.keys(content.variants),
        },
      }),
      ...argTypesGenerator(content),
    }

    const args: Args = {
      defaultAttributes: [['data-component-id', `${sdcStorybookOptions?.namespace}:${basename(id, '.component.yml')}`]],
      componentMetadata: metadata,
      ...(content.variants && {
        variant: Object.keys(content.variants)[0],
      }),
      ...argsGenerator(content, jsonSchemaFakerOptions),
    }

    const basicArgs = { ...args }

    const stories = content.thirdPartySettings?.sdcStorybook?.stories
      ? storiesGenerator(content.thirdPartySettings.sdcStorybook.stories)
      : ''

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
  },
})

// Indexer for YAML-based Storybook stories
export const yamlStoriesIndexer: Indexer = {
  test: /component\.yml$/,
  createIndex: async (fileName, { makeTitle }) => {
    const content = readSDC(fileName)
    const baseTitle = makeTitle(`SDC/${content.name}`)
    const storiesIndex: IndexInput[] = [
      {
        type: 'story',
        importPath: fileName,
        exportName: 'Basic',
        title: baseTitle,
      },
    ]

    const stories = content.thirdPartySettings?.sdcStorybook?.stories
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
  },
}
