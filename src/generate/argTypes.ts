import type { ArgTypes, InputType } from 'storybook/internal/types'
import type { JSONSchema4 } from 'json-schema'
import type { SDCSchema } from '../sdc.d.ts'

// Prop schema as argType; an enum becomes a radio control, `default` fills the
// Default column.
const schemaToArgtypes = (prop: JSONSchema4): InputType => {
  const argType: Record<string, unknown> = { ...prop }
  if (prop.enum) {
    argType.control = 'radio'
    argType.options = prop.enum
  }
  if (prop.default !== undefined) {
    argType.table = {
      defaultValue: {
        summary:
          typeof prop.default === 'string'
            ? prop.default
            : JSON.stringify(prop.default),
      },
    }
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
