import { readdirSync, readFileSync, existsSync } from 'fs'
import { parse } from 'yaml'
import { dirname, extname, join, resolve } from 'path'
import { Args, ArgTypes, Indexer, IndexInput } from '@storybook/types'
import argsGenerator from './argsGenerator'
import argTypesGenerator from './argTypesGenerator'
import storiesGenerator from './storiesGenerator'
import customRefsTransform from './customRefsTransform'
import componentMetadata from './componentMetadata'
import { SDCSchema } from './sdc'

// Helper to read and transform YAML content
const readCDC = (filePath: string): SDCSchema =>
  customRefsTransform(parse(readFileSync(filePath, 'utf8')))

// Retrieve subdirectories from a base directory
const getSubdirectories = (baseDir: string): string[] =>
  readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(baseDir, entry.name))

// Resolve the path to a component YAML file
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

// Generate imports for assets within a directory
const generateImports = (directory: string): string =>
  readdirSync(directory)
    .filter((asset) =>
      ['.css', '.js', '.mjs', '.twig'].includes(extname(asset))
    )
    .map((asset) => {
      const assetPath = `./${asset}`
      return extname(asset) === '.twig'
        ? `import COMPONENT from '${assetPath}';`
        : `import '${assetPath}';`
    })
    .join('\n')

// Extract component imports dynamically based on slots or props
const dynamicImports = (stories: Record<string, any>): string => {
  const imports = new Set<string>()

  const findComponentArgs = (args: Record<string, any>) => {
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
        findComponentArgs(value)
      }
    })
  }

  Object.values(stories).forEach(({ slots = {}, props = {} }) =>
    findComponentArgs({ ...slots, ...props })
  )
  return Array.from(imports).join('\n')
}

// Vite plugin for Storybook YAML stories
export default ({ jsonSchemaFakerOptions = {} }) => ({
  name: 'vite-plugin-storybook-yaml-stories',
  async load(id: string) {
    if (!id.endsWith('component.yml')) return

    const content = readCDC(id)
    const imports = generateImports(dirname(id))
    const storiesImports = dynamicImports(
      content.thirdPartySettings?.sdcStorybook?.stories || {}
    )
    const metadata = componentMetadata(id, content)

    const argTypes: ArgTypes = {
      componentMetadata: { table: { disable: true } },
      ...argTypesGenerator(content),
    }

    const args: Args = {
      componentMetadata: metadata,
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

// Storybook indexer for YAML stories
export const yamlStoriesIndexer: Indexer = {
  test: /component\.yml$/,
  createIndex: async (fileName, { makeTitle }) => {
    const content = readCDC(fileName)
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
