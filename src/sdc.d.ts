import type { JSONSchema4 } from 'json-schema'
import type { JSONSchemaFakerOptions } from 'json-schema-faker'

export interface SDCSchema {
  $schema?: string
  $defs?: JSONSchema4
  name: string
  description?: string
  group?: string
  status?: 'experimental' | 'stable' | 'deprecated' | 'obsolete'
  props?: JSONSchema4
  slots?: SlotDefinition
  libraryOverrides?: LibraryDefinition
  thirdPartySettings?: ThirdPartySettings
  variants?: string[]
}

interface SlotDefinition {
  [key: string]: {
    title?: string
    description?: string
    examples?: string[]
  }
}

interface CssAttributes {
  [key: string]:
    | {
        attributes?: Record<string, any>
        group?: string
        media?: string
        minified?: boolean
        preprocess?: boolean
        type?: string
        weight?: number
      }
    | CssAttributes[]
}

interface CssDefinition {
  base?: CssAttributes
  layout?: CssAttributes
  component?: CssAttributes
  state?: CssAttributes
  theme?: CssAttributes
}

interface JsAttributes {
  [key: string]:
    | {
        attributes?: Record<string, any>
        preprocess?: boolean
        type?: string
        weight?: number
      }
    | JsAttributes[]
}

interface LibraryDefinition {
  dependencies?: string[]
  css?: CssDefinition | CssAttributes[]
  js?: JsAttributes
}

interface ThirdPartySettings {
  [key: string]: Record<string, any>
}

interface SDCStorybookSettings {
  tags?: string[]
  disabledStories?: string[]
  parameters?: Record<string, any>
  stories?: Record<string, Component>
}
export interface NamespaceDefinition {
  namespace?: string
  namespaces?: Record<string, string>
}

export interface SDCStorybookOptions extends NamespaceDefinition {
  experimentalVariants?: boolean
  storyNodesRenderer?: StoryNodeRenderer[]
  twigLib?: 'twing' | 'twig'
  customDefs?: {
    [key: string]: JSONSchema4
  }
  externalDefs?: string[]
  validate?: string | boolean
}

export type StoryNodeRenderer = {
  appliesTo: (item: any) => boolean
  render: (item: any) => string
  priority?: number
}

export interface Component {
  variants?: JSONSchema4
  name?: string
  description: string
  component: string
  props?: JSONSchema4
  slots?: SlotDefinition
  story?: string
  library_wrapper?: string
}

export interface TwigPluginOptions {}

export interface VitePluginTwingDrupalOptions extends TwigPluginOptions {
  namespaces?: Record<string, string[]>
  include?: string
  hooks?: string
}

export interface VitePluginTwigDrupalOptions extends TwigPluginOptions {
  namespaces?: Record<string, string>
  functions?: {}
  globalContext?: {}
}

export interface SDCAddonOptions {
  sdcStorybookOptions: SDCStorybookOptions
  vitePluginTwingDrupalOptions?: VitePluginTwingDrupalOptions
  vitePluginTwigDrupalOptions?: VitePluginTwigDrupalOptions
  jsonSchemaFakerOptions?: JSONSchemaFakerOptions
}
