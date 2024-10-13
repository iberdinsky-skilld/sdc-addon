import { ArgTypes } from "@storybook/types"

const schemaToArgtypes = (prop: Record<string, any>) => ({
  ...prop,
  ...(prop.enum && {
    control: "radio",
    options: prop.enum
  })
})

export default (content: {
  props?: { properties?: Record<string, any> }
  slots?: {}
}): ArgTypes => {
  const generated = content?.props?.properties
    ? Object.entries(content.props.properties).reduce((acc, [key, value]) => {
        acc[key] = schemaToArgtypes(value)
        return acc
      }, {} as ArgTypes)
    : {}

  return generated
}
