import { ArgTypes, InputType } from '@storybook/types'
import { MetadataSchema } from './sdc'

const schemaToArgtypes = (prop: Record<string, any>): InputType => ({
  ...prop,
  ...(prop.enum && {
    control: 'radio',
    options: prop.enum,
  }),
})

export default (content: MetadataSchema): ArgTypes => {
  const generated = content?.props?.properties
    ? Object.entries(content.props.properties).reduce((acc, [key, value]) => {
        acc[key] = schemaToArgtypes(value)
        return acc
      }, {} as ArgTypes)
    : {}

  return generated
}
