import { JSONSchemaFaker } from 'json-schema-faker'
import type { JSONSchemaFakerOptions } from 'json-schema-faker'
import type { Args } from 'storybook/internal/types'
import type { SDCSchema, SlotDefinition } from './sdc.d.ts'

// Helper to generate argument strings (for props, slots, or variants)
const generateArgs = (
  schema:
    | SDCSchema['props']['properties']
    | SlotDefinition
    | Record<string, any>,
  defs: SDCSchema['$defs']
): Args => {
  return Object.entries(schema).reduce<Args>((acc, [key, property]) => {
    acc[key] = JSONSchemaFaker.generate(property, defs)
    if (acc[key] instanceof Object) {
      acc[key] = Object.values(acc[key])
    }
    return acc
  }, {})
}

// Convert slot definitions to schema properties
const slotsToSchemaProperties = (
  slots: SlotDefinition
): Record<string, { type: string } & SlotDefinition[string]> => {
  return Object.fromEntries(
    Object.entries(slots).map(([key, value]) => [
      key,
      { type: 'string', ...value },
    ])
  )
}

export default function generateStorybookArgs(
  content: SDCSchema,
  jsonSchemaFakerOptions: JSONSchemaFakerOptions
): Args {
  // Configure JSON Schema Faker options
  JSONSchemaFaker.option({
    ...jsonSchemaFakerOptions,
  })

  const { props, slots, $defs } = content

  // Generate arguments from properties and slots
  const generatedArgs: Args = {
    ...(props?.properties && generateArgs(props.properties, $defs)),
    ...(slots && generateArgs(slotsToSchemaProperties(slots), $defs)),
  }

  return generatedArgs
}
