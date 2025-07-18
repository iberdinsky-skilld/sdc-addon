import type { ArgTypes, InputType } from 'storybook/internal/types'
import type { SDCSchema } from './sdc'

const schemaToArgtypes = (prop: Record<string, any>): InputType => ({
  ...prop,
  ...(prop.enum && {
    control: 'radio',
    options: prop.enum,
  }),
})

export default (content: SDCSchema): ArgTypes => {
  const generated = content?.props?.properties
    ? Object.entries(content.props.properties).reduce((acc, [key, value]) => {
        acc[key] = schemaToArgtypes(value)
        return acc
      }, {} as ArgTypes)
    : {}

  return generated
}
