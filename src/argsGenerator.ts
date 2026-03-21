import { generate } from 'json-schema-faker'
import type { GenerateOptions } from 'json-schema-faker'
import type { Args } from '@storybook/html-vite'
import type { SDCSchema, SlotDefinition } from './sdc.d.ts'

const createGenerateOptions = (
  defs: SDCSchema['$defs'],
  jsonSchemaFakerOptions: GenerateOptions
): GenerateOptions => {
  const defsRecord = (defs ?? {}) as Record<string, any>
  const userRefResolver = jsonSchemaFakerOptions.refResolver

  if (Object.keys(defsRecord).length === 0 && !userRefResolver) {
    return jsonSchemaFakerOptions
  }

  return {
    ...jsonSchemaFakerOptions,
    refResolver: async (ref: string) => {
      if (Object.prototype.hasOwnProperty.call(defsRecord, ref)) {
        return defsRecord[ref]
      }

      if (userRefResolver) {
        return userRefResolver(ref)
      }

      return undefined
    },
  }
}

// Helper to generate argument strings (for props, slots, or variants)
const generateArgs = (
  schema:
    | SDCSchema['props']['properties']
    | SlotDefinition
    | Record<string, any>,
  defs: SDCSchema['$defs'],
  jsonSchemaFakerOptions: GenerateOptions
): Promise<Args> => {
  return Object.entries(schema).reduce<Promise<Args>>(
    async (accPromise, [key, property]) => {
      const acc = await accPromise
      const schemaWithDefs = {
        ...(property as Record<string, any>),
        ...(defs ? { $defs: defs } : {}),
      }

      acc[key] = await generate(schemaWithDefs, jsonSchemaFakerOptions)
      if (!Array.isArray(acc[key]) && acc[key] instanceof Object && (property as any).type !== 'object') {
        acc[key] = Object.values(acc[key])
      }
      return acc
    },
    Promise.resolve({})
  )
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

export default async function generateStorybookArgs(
  content: SDCSchema,
  jsonSchemaFakerOptions: GenerateOptions
): Promise<Args> {
  const { props, slots, $defs } = content
  const generateOptions = createGenerateOptions($defs, jsonSchemaFakerOptions)

  // Generate arguments from properties and slots
  const generatedArgs: Args = {
    ...(props?.properties &&
      (await generateArgs(props.properties, $defs, generateOptions))),
    ...(slots &&
      (await generateArgs(
        slotsToSchemaProperties(slots),
        $defs,
        generateOptions
      ))),
  }

  return generatedArgs
}
