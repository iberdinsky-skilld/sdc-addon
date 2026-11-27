// Vite plugin that turns a *.component.yml into a Storybook CSF module.
import { dirname, basename, join } from 'node:path'
import type { Plugin, Rollup } from 'vite'
import type { Args, ArgTypes } from 'storybook/internal/types'
import type { GenerateOptions } from 'json-schema-faker'
import type { JSONSchema4 } from 'json-schema'
import { logger } from '../logger.ts'
import argsGenerator from '../generate/args.ts'
import argTypesGenerator from '../generate/argTypes.ts'
import storiesGenerator from '../generate/stories.ts'
import componentMetadata from '../generate/componentMetadata.ts'
import { componentModule } from '../generate/componentModule.ts'
import type { Namespaces } from '../generate/namespaces.ts'
import {
  collectStoryFilesSync,
  loadStoryFilesSync,
  readSDC,
} from '../generate/componentFiles.ts'
import {
  storyComponentImports,
  templateDependencies,
  twigDependencyImports,
} from '../generate/componentImports.ts'
import {
  libraryOverridesImports,
  libraryOverridesLocalImports,
} from '../generate/libraryAssets.ts'
import { registerCustomNodes } from '../renderer/nodes.ts'
import type { SDCStorybookOptions, StoryDefinition } from '../sdc.d.ts'
import {
  assetInjectorModule,
  VIRTUAL_ASSET_INJECTOR,
  VIRTUAL_ASSET_INJECTOR_ID,
} from './assetInjector.ts'
import { VIRTUAL_TWIG, VIRTUAL_TWING } from './sdcTwigRuntime.ts'

export interface YamlStoriesPluginOptions {
  jsonSchemaFakerOptions?: GenerateOptions
  sdcStorybookOptions?: SDCStorybookOptions
  globalDefs?: Record<string, JSONSchema4>
  namespaces: Namespaces
}

export type LoadContext = Pick<Rollup.PluginContext, 'addWatchFile'>

// Hooks as plain functions; `YamlStoriesPlugin` wraps them.
export const createYamlStoriesHooks = ({
  jsonSchemaFakerOptions = {},
  sdcStorybookOptions = {},
  globalDefs = {},
  namespaces,
}: YamlStoriesPluginOptions) => ({
  resolveId(id: string): string | undefined {
    if (id === VIRTUAL_ASSET_INJECTOR) return VIRTUAL_ASSET_INJECTOR_ID
    return undefined
  },
  async load(this: LoadContext, id: string): Promise<string | undefined> {
    if (id === VIRTUAL_ASSET_INJECTOR_ID) return assetInjectorModule

    if (id.endsWith('story.yml')) {
      // Story files are emitted with their component.yml.
      return ''
    }

    if (!id.endsWith('component.yml')) return undefined

    try {
      const content = await readSDC(id, globalDefs)
      const externalAssets = libraryOverridesImports(
        content,
        sdcStorybookOptions.dependencyMap ?? {}
      )
      const localAssets = libraryOverridesLocalImports(
        content,
        basename(id, '.component.yml')
      )
      // Story file edits must regenerate this module.
      collectStoryFilesSync(dirname(id)).forEach((file) =>
        this.addWatchFile(file)
      )

      const previewsStories: Record<string, StoryDefinition> = {
        ...(content.thirdPartySettings?.sdcStorybook?.stories ?? {}),
        ...loadStoryFilesSync(id),
      }
      registerCustomNodes(sdcStorybookOptions.customNodes)

      const storiesImports = storyComponentImports(previewsStories, namespaces)
      const componentBaseName = basename(id, '.component.yml')
      const namespace = namespaces.pathToNamespace(dirname(id))
      const componentId = namespaces.pathToNamespace(dirname(id), true)
      const twigFile = join(dirname(id), `${componentBaseName}.twig`)
      const twigImports = twigDependencyImports(twigFile, namespaces)
      const metadata = componentMetadata(id, content)
      const componentGlobals =
        content.thirdPartySettings?.sdcStorybook?.globals ?? {}

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
        defaultAttributes: [['data-component-id', componentId]],
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

      const stories = storiesGenerator(
        previewsStories,
        componentGlobals,
        (wrapper) => templateDependencies(wrapper, namespaces)
      )

      return componentModule({
        componentId,
        twigTemplate: `${namespace}/${componentBaseName}.twig`,
        runtimeModule:
          sdcStorybookOptions.twigLib === 'twing'
            ? VIRTUAL_TWING
            : VIRTUAL_TWIG,
        assetInjector: VIRTUAL_ASSET_INJECTOR,
        localAssets,
        externalAssets,
        componentImports: storiesImports,
        templateImports: twigImports,
        parameters: content.thirdPartySettings?.sdcStorybook?.parameters ?? {},
        description: content.description,
        globals: componentGlobals,
        argTypes,
        args,
        basicArgs,
        stories,
        slotNames: Object.keys(content.slots ?? {}),
      })
    } catch (error) {
      logger.error(`Error loading component YAML file: ${id}, ${String(error)}`)
      throw error
    }
  },
})

export default function YamlStoriesPlugin(
  options: YamlStoriesPluginOptions
): Plugin {
  return {
    name: 'vite-plugin-storybook-yaml-stories',
    ...createYamlStoriesHooks(options),
  }
}
