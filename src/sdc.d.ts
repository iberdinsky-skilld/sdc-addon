import type { JSONSchema4 } from 'json-schema'
import type { GenerateOptions } from 'json-schema-faker'
import type { Parameters } from '@storybook/html-vite'
import type { Globals } from 'storybook/internal/types'

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

export interface CssFileOptions {
  attributes?: Record<string, any>
  group?: string
  media?: string
  minified?: boolean
  preprocess?: boolean
  type?: string
  weight?: number
}

/**
 * One CSS group (base / layout / component / state / theme). Keys are file
 * paths or URLs. A `false` value disables an asset, matching Drupal's
 * `libraryOverrides` semantics.
 */
export type CssGroup = Record<string, CssFileOptions | false>

export interface CssSection {
  base?: CssGroup
  layout?: CssGroup
  component?: CssGroup
  state?: CssGroup
  theme?: CssGroup
}

export interface JsFileOptions {
  attributes?: Record<string, string | boolean>
  preprocess?: boolean
  type?: string
  weight?: number
}

/**
 * Keys are file paths or URLs. A `false` value disables an asset, matching
 * Drupal's `libraryOverrides` semantics.
 */
export type JsSection = Record<string, JsFileOptions | false>

export interface LibraryDefinition {
  dependencies?: string[]
  css?: CssSection
  js?: JsSection
}

export interface ExternalCssAsset {
  type: 'css'
  url: string
  media?: string
  attributes?: Record<string, string | boolean>
}

export interface ExternalJsAsset {
  type: 'js'
  url: string
  attributes?: Record<string, string | boolean>
}

export type ExternalAsset = ExternalCssAsset | ExternalJsAsset

interface ThirdPartySettings {
  [key: string]: Record<string, any>
}

interface SDCStorybookSettings {
  tags?: string[]
  disabledStories?: string[]
  parameters?: Parameters
  globals?: Globals
  stories?: Record<string, Component>
}
export interface NamespaceDefinition {
  namespace?: string
  namespaces?: Record<string, string>
}

export type ResolveIconSource = (
  source: string,
  context: { packId: string; namespace: string }
) => string

export interface SDCStorybookOptions extends NamespaceDefinition {
  experimentalVariants?: boolean
  useBasicArgsForStories?: boolean
  storyNodesRenderer?: StoryNodeRenderer[]
  dependencyMap?: Record<string, ExternalAsset[]>
  resolveIconSource?: ResolveIconSource
  twigLib?: 'twing' | 'twig'
  customDefs?: {
    [key: string]: JSONSchema4
  }
  externalDefs?: string[]
  validate?: string | boolean
}

export type StoryNodeRenderer = {
  appliesTo: (item: any) => boolean
  // `renderValue` renders a nested value (node, array of nodes, or primitive)
  // through the shared pipeline — the same way component slots are rendered.
  render: (item: any, renderValue: (value: any) => string) => string
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
  include?: string | RegExp
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
  jsonSchemaFakerOptions?: GenerateOptions
}

export interface IconPackSettings {
  [key: string]: {
    type?: string
    default?: any
    [key: string]: any
  }
}

export interface SvgIconData {
  content: string
  attrs: Record<string, string>
  sourceUrl: string
  group: string
}

export interface PathIconData {
  sourceUrl: string
  group: string
}

export interface IconPack {
  packId: string
  label: string
  extractor: 'svg_sprite' | 'svg' | 'path'
  sources: string[]
  sourceUrls: string[]
  settings: IconPackSettings
  template: string
  svgIcons: Record<string, SvgIconData>
  pathIcons: Record<string, PathIconData>
}

export type IconPacks = Record<string, IconPack>
