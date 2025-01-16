import { JSONSchemaFaker } from 'json-schema-faker'
import type { JSONSchemaFakerOptions } from 'json-schema-faker'
import type { Args } from '@storybook/types'
import type { SDCSchema, SDCStorybookOptions, SlotDefinition } from './sdc'

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
    ignoreMissingRefs: true,
    failOnInvalidTypes: false,
    useExamplesValue: true,
    useDefaultValue: true,
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
