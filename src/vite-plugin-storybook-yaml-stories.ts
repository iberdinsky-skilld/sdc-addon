import { readdirSync, readFileSync, existsSync } from 'fs'
import { parse } from 'yaml'
import { dirname, extname, relative, resolve, join } from 'path'
import { Args, ArgTypes, Indexer, IndexInput } from '@storybook/types'
import argsGenerator from './argsGenerator'
import argTypesGenerator from './argTypesGenerator'
import storiesGenerator from './storiesGenerator'
import customRefsTransform from './customRefsTransform'
import componentMetadata from './componentMetadata'
import { MetadataSchema } from './sdc'

// Helper function to read YAML files
const readCDC = (id: string): MetadataSchema =>
  customRefsTransform(parse(readFileSync(id, 'utf8')))

// Get all subdirectories in the given directory
const getSubdirectories = (baseDir: string): string[] =>
  readdirSync(baseDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => join(baseDir, dirent.name))

// Resolve component paths dynamically
const resolveComponentPath = (
  namespace: string,
  component: string
): string | undefined => {
  const baseComponentDir = resolve('./components')
  const directories = [baseComponentDir, ...getSubdirectories(baseComponentDir)]

  const possiblePaths = directories.map((dir) =>
    join(dir, component, `${component}.component.yml`)
  )

  return possiblePaths.find(existsSync)
}

// Generate imports for CSS, JS, and Twig files
const generateImports = (directory: string): string =>
  readdirSync(directory).reduce((imports, asset) => {
    const extension = extname(asset)
    const assetPath = `./${asset}`

    if (['.css', '.js', '.mjs'].includes(extension)) {
      return `${imports}import '${assetPath}';\n`
    } else if (extension === '.twig') {
      return `${imports}import COMPONENT from '${assetPath}';\n`
    }
    return imports
  }, '')

// Generate dynamic imports for components
const dynamicImports = (stories: Record<string, any>): string => {
  const imports = new Set<string>()

  const findComponentArgs = (args: Record<string, any>) => {
    for (const key in args) {
      const value = args[key]
      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (item.type === 'component') {
            const [namespace, componentName] = item.component.split(':')
            const resolvedPath = resolveComponentPath(namespace, componentName)

            if (resolvedPath) {
              const kebabCaseName = componentName.replace(/-/g, '')
              imports.add(`import ${kebabCaseName} from '${resolvedPath}';`)
            }
          }
        })
      } else if (typeof value === 'object' && value !== null) {
        findComponentArgs(value)
      }
    }
  }

  Object.values(stories).forEach(({ slots = {}, props = {} }) => {
    findComponentArgs({ ...slots, ...props })
  })

  return Array.from(imports).join('\n')
}

// Vite plugin to handle Storybook YAML stories
export default ({ jsonSchemaFakerOptions = {} }) => ({
  name: 'vite-plugin-storybook-yaml-stories',
  async load(id: string) {
    if (!id.endsWith('component.yml')) return

    const content = readCDC(id)
    const imports = generateImports(dirname(id))
    const storiesImports = dynamicImports(
      content.thirdPartySettings?.sdcStorybook?.stories || {}
    )

    const argTypes: ArgTypes = {
      componentMetadata: { table: { disable: true } },
      ...argTypesGenerator(content),
    }

    const metadata = componentMetadata(id, content);

    const args: Args = {
      componentMetadata: metadata,
      ...argsGenerator(content, jsonSchemaFakerOptions),
    }

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
