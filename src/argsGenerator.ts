import { JSONSchemaFaker } from 'json-schema-faker'
import { Args } from '@storybook/types'
import { MetadataSchema, SlotDefinition } from './sdc'

const generateArgs = (
  schema: MetadataSchema['props']['properties'] | SlotDefinition,
  defs: MetadataSchema['$defs'],
): Args => {
  const generated: Args = {}
  for (const key in schema) {
    const property = schema[key]

    generated[key] = JSONSchemaFaker.generate(property, defs)
  }

  return generated
}

const slotsToMarkup = (slots: SlotDefinition) =>
  Object.entries(slots).reduce<
    Record<string, { type: string } & SlotDefinition[string]>
  >((acc, [key, value]) => {
    acc[key] = { type: 'string', ...value }
    return acc
  }, {})

export default (
  content: MetadataSchema,
  jsonSchemaFakerOptions: Record<string, any>
): Args => {
  JSONSchemaFaker.option({
    ignoreMissingRefs: true,
    failOnInvalidTypes: false,
    useExamplesValue: true,
    useDefaultValue: true,
    ...jsonSchemaFakerOptions,
  })

  const generatedArgs = {
    ...(content?.props?.properties && generateArgs(content.props.properties, content['$defs'])),
    ...(content?.slots && generateArgs(slotsToMarkup(content.slots), content['$defs'])),
  }

  return generatedArgs
}
