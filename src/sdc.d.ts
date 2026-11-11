import type { JSONSchema4 } from 'json-schema'
import type { GenerateOptions } from 'json-schema-faker'
import type { Parameters } from '@storybook/html-vite'
import type { Globals } from 'storybook/internal/types'
import type Twig from 'twig'

// A user-defined render node: `match` selects it, `render` returns HTML or
// another node. Works in plain and wrapper slots; Twing Maps arrive as objects.
export interface CustomNode {
  match: (item: Record<string, unknown>) => boolean
  render: (item: Record<string, unknown>) => string | object
}

export interface SDCSchema {
  $schema?: string
  // Keyed by `$ref`, e.g. `ui-patterns://links`.
  $defs?: Record<string, JSONSchema4>
  name: string
  description?: string
  group?: string
  status?: 'experimental' | 'stable' | 'deprecated' | 'obsolete'
  props?: JSONSchema4
  slots?: SlotDefinition
  libraryOverrides?: LibraryDefinition
  thirdPartySettings?: ThirdPartySettings
  // Drupal 11.2+ variants.
  variants?: Record<string, VariantDefinition>
}

export interface VariantDefinition {
  title: string
  description?: string
}

interface SlotDefinition {
  [key: string]: {
    title?: string
    description?: string
    examples?: string[]
  }
}

export interface CssFileOptions {
  attributes?: Record<string, string | boolean>
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

// The addon reads `sdcStorybook`; other modules keep their own keys.
export interface ThirdPartySettings {
  sdcStorybook?: SDCStorybookSettings
  [key: string]: unknown
}

export interface SDCStorybookSettings {
  tags?: string[]
  disabledStories?: string[]
  parameters?: Parameters
  globals?: Globals
  stories?: Record<string, StoryDefinition>
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
  customNodes?: CustomNode[]
  dependencyMap?: Record<string, ExternalAsset[]>
  resolveIconSource?: ResolveIconSource
  twigLib?: 'twing' | 'twig'
  customDefs?: {
    [key: string]: JSONSchema4
  }
  externalDefs?: string[]
  validate?: string | boolean
}

// A story from `sdcStorybook.stories` or a *.story.yml. Prop and slot values
// are YAML: scalars, render nodes or arrays of them.
export interface StoryDefinition {
  name?: string
  description?: string
  props?: Record<string, unknown>
  slots?: Record<string, unknown>
  variants?: Record<string, VariantDefinition>
  library_wrapper?: string
  parameters?: Parameters
  globals?: Globals
  thirdPartySettings?: {
    sdcStorybook?: Pick<SDCStorybookSettings, 'parameters' | 'globals'>
  }
}

// `type: component` node: embeds a component, optionally from a story's args.
export interface ComponentNode {
  type: 'component'
  component: string
  props?: Record<string, unknown>
  slots?: Record<string, unknown>
  story?: string
}

export interface VitePluginTwingDrupalOptions {
  namespaces?: Record<string, string[]>
  include?: string | RegExp
  hooks?: string
}

export interface VitePluginTwigDrupalOptions {
  namespaces?: Record<string, string>
  // Serialized into each compiled template and called with twig.js.
  functions?: Record<string, (twig: typeof Twig) => void>
  globalContext?: Record<string, unknown>
}

export interface SDCAddonOptions {
  sdcStorybookOptions: SDCStorybookOptions
  vitePluginTwingDrupalOptions?: VitePluginTwingDrupalOptions
  vitePluginTwigDrupalOptions?: VitePluginTwigDrupalOptions
  jsonSchemaFakerOptions?: GenerateOptions
}

// *.icons.yml `settings`; `default` applies when icon() omits the key.
export type IconPackSettings = Record<string, { default?: unknown }>

// Any other extractor still renders, like `path` (source and icon_id).
export type KnownIconExtractor = 'svg_sprite' | 'svg' | 'path'
export type IconExtractor = KnownIconExtractor | (string & {})

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
  extractor: IconExtractor
  sources: string[]
  sourceUrls: string[]
  settings: IconPackSettings
  template: string
  svgIcons: Record<string, SvgIconData>
  pathIcons: Record<string, PathIconData>
}

export type IconPacks = Record<string, IconPack>
