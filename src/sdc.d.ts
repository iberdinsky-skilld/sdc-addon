import { JSONSchema4 } from 'json-schema'
export interface SDCSchema {
  $schema?: string
  $defs?: JSONSchema4,
  name: string
  description?: string
  group?: string
  status?: 'experimental' | 'stable' | 'deprecated' | 'obsolete'
  props?: JSONSchema4
  slots?: SlotDefinition
  libraryOverrides?: LibraryDefinition
  thirdPartySettings?: ThirdPartySettings
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
