import { readdirSync, readFileSync, existsSync } from 'fs'
import { parse } from 'yaml'
import { dirname, extname, relative, resolve, join } from 'path'
import { Args, ArgTypes, Indexer, IndexInput } from '@storybook/types'
import argsGenerator from './argsGenerator'
import argTypesGenerator from './argTypesGenerator'
import storiesGenerator from './storiesGenerator'

// Helper function to read YAML files
const readCDC = (id: string) => parse(readFileSync(id, 'utf8'))

// Function to dynamically find all subdirectories
const getSubdirectories = (baseDir: string): string[] => {
  return readdirSync(baseDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => join(baseDir, dirent.name))
}

// Dynamically resolve component path based on namespace
const resolveComponentPath = (namespace: string, component: string) => {
  const baseComponentDir = resolve('./components')
  const componentDirectories = [
    baseComponentDir,
    ...getSubdirectories(baseComponentDir),
  ]

  const possiblePaths = componentDirectories.map((dir) =>
    join(dir, component, `${component}.component.yml`)
  )

  return possiblePaths.find((path) => existsSync(path))
}

// Generate imports for JS and CSS files
const generateImports = (directory: string) => {
  const assets = readdirSync(directory)
  return assets.reduce((imports, asset) => {
    const assetPath = `./${asset}`
    const extension = extname(asset)

    if (['.css', '.js'].includes(extension)) {
      return `${imports} import '${assetPath}';\n`
    }
    if (extension === '.twig') {
      return `${imports} import COMPONENT from '${assetPath}';\n`
    }
    return imports
  }, '')
}

// Dynamically import components based on component paths
const dynamicImports = (stories: Record<string, any>) => {
  const imports: Set<string> = new Set()

  const findComponentArgs = (args: any) => {
    for (const key in args) {
      const value = args[key]

      if (Array.isArray(value)) {
        value.forEach((item: any) => {
          if (item.type === 'component') {
            const [namespace, componentName] = item.component.split(':')
            const resolvedPath = resolveComponentPath(namespace, componentName)

            if (resolvedPath) {
              const kebabCaseName = componentName.replace(/[-]/g, '')
              imports.add(`import ${kebabCaseName} from '${resolvedPath}';`)
            }
          }
        })
      } else if (typeof value === 'object' && value !== null) {
        findComponentArgs(value)
      }
    }
  }

  Object.entries(stories).forEach(([_, story]) => {
    findComponentArgs(story.slots || {})
  })

  return Array.from(imports).join('\n')
}

export default async ({ jsonSchemaFakerOptions }) => {
  return {
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

      const args: Args = {
        componentMetadata: {
          path: relative(process.cwd(), dirname(id)),
          machineName: id,
          status: content.status || 'stable',
          name: content.name,
          group: content.group || 'All Components',
        },
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
  }
}

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
      Object.entries(stories).forEach(([storyKey, _]) => {
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
