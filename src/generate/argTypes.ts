import type { ArgTypes, InputType } from 'storybook/internal/types'
import type { JSONSchema4 } from 'json-schema'
import type { SDCSchema } from '../sdc.d.ts'

// Prop schema as argType; an enum becomes a radio control.
const schemaToArgtypes = (prop: JSONSchema4): InputType => {
  const argType: Record<string, unknown> = { ...prop }
  if (prop.enum) {
    argType.control = 'radio'
    argType.options = prop.enum
  }
  return argType
}

export default (content: SDCSchema): ArgTypes => {
  const generated = content.props?.properties
    ? Object.entries(content.props.properties).reduce((acc, [key, value]) => {
        acc[key] = schemaToArgtypes(value)
        return acc
      }, {} as ArgTypes)
    : {}

  return generated
}
