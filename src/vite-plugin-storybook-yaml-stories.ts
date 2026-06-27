import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { parse as parseYaml } from 'yaml'
import { join, basename, dirname } from 'node:path'
import { logger } from './logger.ts'
import { sanitizeStoryKey } from './utils.ts'

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
import type {
  Component,
  ExternalAsset,
  ExternalCssAsset,
  ExternalJsAsset,
  LibraryDefinition,
  SDCSchema,
  SDCStorybookOptions,
} from './sdc.d.ts'
import type { GenerateOptions } from 'json-schema-faker'
import type { JSONSchema4 } from 'json-schema'
import { validateJson } from './validateJson.ts'
import { capitalize, convertToKebabCase, deriveGroupFromPath } from './utils.ts'
import {
  Namespaces,
  getProjectName,
  resolveComponentPath,
} from './namespaces.ts'
import { VIRTUAL_TWIG, VIRTUAL_TWING } from './vite-plugin-sdc-twig-runtime.ts'

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

const VIRTUAL_ASSET_INJECTOR = 'virtual:sdc-asset-injector'
const VIRTUAL_ASSET_INJECTOR_ID = '\0' + VIRTUAL_ASSET_INJECTOR

const assetInjectorModule = `
export async function injectAssets(assets) {
  if (typeof document === 'undefined') return
  await Promise.all(assets.map((asset) => {
    const sel = asset.type === 'js' ? \`script[src="\${asset.url}"]\` : \`link[href="\${asset.url}"]\`
    if (document.querySelector(sel)) return Promise.resolve()
    return new Promise((res, rej) => {
      if (asset.type === 'js') {
        const s = document.createElement('script'); s.src = asset.url; s.onload = res; s.onerror = rej; document.head.appendChild(s)
      } else {
        const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = asset.url
        if (asset.media) l.media = asset.media; l.onload = res; document.head.appendChild(l)
      }
    })
  }))
}
`

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

const CSS_GROUPS = ['base', 'layout', 'component', 'state', 'theme'] as const

const isExternalUrl = (s: string): boolean =>
  s.startsWith('http://') || s.startsWith('https://')

const extractCssAssets = (library: LibraryDefinition): ExternalCssAsset[] =>
  CSS_GROUPS.flatMap((group) =>
    Object.entries(library.css?.[group] ?? {})
      .filter(([url]) => isExternalUrl(url))
      .map(
        ([url, opts]): ExternalCssAsset => ({
          type: 'css',
          url,
          media: opts.media,
        })
      )
  )

const extractJsAssets = (library: LibraryDefinition): ExternalJsAsset[] =>
  Object.entries(library.js ?? {})
    .filter(([url]) => isExternalUrl(url))
    .map(
      ([url, opts]): ExternalJsAsset => ({
        type: 'js',
        url,
        attributes: opts.attributes as Record<string, string> | undefined,
      })
    )

export const libraryOverridesImports = (
  content: SDCSchema,
  dependencyMap: Record<string, ExternalAsset[]> = {}
): ExternalAsset[] => {
  const overrides = content.libraryOverrides
  if (!overrides) return []
  return [
    ...extractCssAssets(overrides),
    ...extractJsAssets(overrides),
    ...(overrides.dependencies ?? []).flatMap(
      (dep) => dependencyMap[dep] ?? []
    ),
  ]
}

// Parse a .twig file for {% include/embed/extends 'ns:component' %} directives
// and return import statements for each resolved component's .component.yml.
// This ensures sub-component CSS/JS assets are loaded even when composition
// happens inside a Twig template rather than in YAML story definitions.
export const twigDependencyImports = (
  twigFilePath: string,
  namespaces: Namespaces
): string => {
  if (!existsSync(twigFilePath)) return ''

  const twigContent = readFileSync(twigFilePath, 'utf8')
  const imports = new Set<string>()

  // Match include/embed/extends with a 'namespace:component' reference (SDC format).
  // Intentionally excludes @namespace/path style (non-component asset refs).
  const pattern =
    /{%-?\s*(?:include|embed|extends)\s+['"]([a-zA-Z0-9_-]+:[a-zA-Z0-9_/-]+)['"]/g
  let match: RegExpExecArray | null

  while ((match = pattern.exec(twigContent)) !== null) {
    const [namespace, componentName] = match[1].split(':')
    const resolvedPath = resolveComponentPath(
      namespace,
      componentName,
      namespaces
    )
    if (resolvedPath) {
      imports.add(`import '${resolvedPath}';`)
    }
  }

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
        const capitalizedKey = capitalize(storyKey)
        const exportName =
          capitalizedKey === 'Basic'
            ? `Variant_${capitalizedKey}`
            : capitalizedKey

        storiesIndex.push({
          type: 'story',
          importPath: fileName,
          exportName,
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
  jsonSchemaFakerOptions = {} as GenerateOptions,
  sdcStorybookOptions = {} as SDCStorybookOptions,
  globalDefs = {} as JSONSchema4,
  namespaces = {} as Namespaces,
}) => ({
  name: 'vite-plugin-storybook-yaml-stories',
  resolveId(id: string) {
    if (id === VIRTUAL_ASSET_INJECTOR) return VIRTUAL_ASSET_INJECTOR_ID
  },
  async load(id: string) {
    if (id === VIRTUAL_ASSET_INJECTOR_ID) return assetInjectorModule

    if (id.endsWith('story.yml')) {
      // We need to load the story.yml to support reload.
      // But we ignore to load them.
      return ''
    }

    if (!id.endsWith('component.yml')) return

    try {
      const content = readSDC(id, globalDefs, sdcStorybookOptions.validate)
      const externalAssets = libraryOverridesImports(
        content,
        sdcStorybookOptions.dependencyMap ?? {}
      )
      // Watch every *.story.yml in the component folder (including nested
      // subfolders) so edits invalidate this module and regenerate stories.
      // `this` is Rollup's PluginContext at runtime; absent in unit tests that
      // call load() directly, so guard the optional call.
      const ctx = this as unknown as {
        addWatchFile?: (id: string) => void
      }
      collectStoryFilesSync(dirname(id)).forEach((file) =>
        ctx.addWatchFile?.(file)
      )

      const previewsStories = {
        ...(content.thirdPartySettings?.sdcStorybook?.stories || {}),
        ...loadStoryFilesSync(id),
      }
      storyNodeRenderer.register(sdcStorybookOptions.storyNodesRenderer ?? [])

      const storiesImports = dynamicImports(previewsStories, namespaces)
      const componentBaseName = basename(id, '.component.yml')
      const namespace = namespaces.pathToNamespace(dirname(id))
      const twigFile = join(dirname(id), `${componentBaseName}.twig`)
      const twigImports = twigDependencyImports(twigFile, namespaces)
      const metadata = componentMetadata(id, content)
      const componentGlobals =
        content?.thirdPartySettings?.sdcStorybook?.globals ?? {}

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

      const baseArgs: Args = {
        defaultAttributes: [
          ['data-component-id', namespaces.pathToNamespace(dirname(id), true)],
        ],
        componentMetadata: metadata,
        ...(content.variants && {
          variant: Object.keys(content.variants)[0],
        }),
      }

      const generatedArgs = await argsGenerator(content, jsonSchemaFakerOptions)

      const args: Args = sdcStorybookOptions.useBasicArgsForStories
        ? { ...baseArgs, ...generatedArgs }
        : baseArgs

      const basicArgs: Args = sdcStorybookOptions.useBasicArgsForStories
        ? baseArgs
        : { ...baseArgs, ...generatedArgs }

      const componentId = namespaces.pathToNamespace(dirname(id), true)
      const stories = previewsStories
        ? storiesGenerator(previewsStories, componentGlobals, componentId)
        : ''

      const assetInjection =
        externalAssets.length > 0
          ? `await injectAssets(${JSON.stringify(externalAssets)});`
          : ''

      const iconModule =
        sdcStorybookOptions.twigLib === 'twing' ? VIRTUAL_TWING : VIRTUAL_TWIG

      return `
import COMPONENT from '${namespace}/${componentBaseName}.twig';
void import.meta.glob('./*.css', { eager: true });
import { injectAssets } from '${VIRTUAL_ASSET_INJECTOR}';
import { renderIcon as _sdcRenderIcon, renderInline as _sdcRenderInline, makeStory as _sdcMakeStory } from '${iconModule}';
${storiesImports}
${twigImports}
${assetInjection}
await Promise.all(Object.values(import.meta.glob('./*.{js,mjs}')).map(fn => fn()));
class TwigSafeArray extends Array {
  toString() {
    return this.join('');
  }
}

export default {
  component: COMPONENT,
  parameters: {
    ...${JSON.stringify(content?.thirdPartySettings?.sdcStorybook?.parameters ?? {}, null, 2)},
    docs: {description: {component: ${JSON.stringify(content.description, null, 2)}}},
  },
  ${
    Object.keys(componentGlobals).length > 0
      ? `globals: ${JSON.stringify(componentGlobals, null, 2)},`
      : ''
  }
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
      const oldDisableBasicStory =
        content.thirdPartySettings?.sdcStorybook?.disableBasicStory
      const newDisabledStories =
        content.thirdPartySettings?.sdcStorybook?.disabledStories

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

// Recursively collect *.story.yml files within a component's folder, at any
// depth (e.g. a nested `stories/` subfolder). Subfolders that contain their own
// *.component.yml are skipped so a nested component's stories don't leak into
// its parent.
const collectStoryFilesSync = (rootDir: string): string[] => {
  const out: string[] = []
  const walk = (dir: string, isRoot: boolean) => {
    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    // A nested directory that owns a *.component.yml belongs to another
    // component; don't descend into it (the root itself is always walked).
    if (
      !isRoot &&
      entries.some(
        (entry) => entry.isFile() && entry.name.endsWith('.component.yml')
      )
    ) {
      return
    }
    for (const entry of entries) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full, false)
      } else if (entry.name.endsWith('.story.yml')) {
        out.push(full)
      }
    }
  }
  walk(rootDir, true)
  return out
}

// Load *.story.yml files.
const loadStoryFilesSync = (fileName: string) => {
  const folderPath = dirname(fileName)
  const storyFiles = collectStoryFilesSync(folderPath)

  return storyFiles.reduce(
    (acc, file) => {
      const content = readFileSync(file, 'utf8')
      const rawKey = basename(file).split('.')[1]
      const key = sanitizeStoryKey(rawKey)
      if (Object.prototype.hasOwnProperty.call(acc, key)) {
        logger.warn(
          `Duplicate story key "${key}" from ${file} overrides an earlier story while indexing ${fileName}`
        )
      }
      return {
        ...acc,
        [key]: parseYaml(content),
      }
    },
    {} as Record<string, any>
  )
}
