import { generate } from 'json-schema-faker'
import type { GenerateOptions, JsonSchema } from 'json-schema-faker'
import type { Args } from '@storybook/html-vite'
import type { JSONSchema4 } from 'json-schema'
import type { SDCSchema, SlotDefinition } from '../sdc.d.ts'
import { isRecord } from '../guards.ts'

// A schema object in the faker's dialect (`JsonSchema` also allows booleans).
type FakerSchema = Exclude<JsonSchema, boolean>

const toFakerSchemaMap = (
  map: Record<string, JSONSchema4>
): Record<string, FakerSchema> =>
  Object.fromEntries(
    Object.entries(map).map(([key, value]) => [key, toFakerSchema(value)])
  )

// SDC schemas are draft-04, json-schema-faker reads 2020-12: convert boolean
// exclusive bounds and tuple `items`. Data keywords are left alone.
export const toFakerSchema = (schema: JSONSchema4): FakerSchema => {
  const out: Record<string, unknown> = { ...schema }

  if (typeof schema.exclusiveMinimum === 'boolean') {
    delete out.exclusiveMinimum
    if (schema.exclusiveMinimum && schema.minimum !== undefined) {
      out.exclusiveMinimum = schema.minimum
      delete out.minimum
    }
  }
  if (typeof schema.exclusiveMaximum === 'boolean') {
    delete out.exclusiveMaximum
    if (schema.exclusiveMaximum && schema.maximum !== undefined) {
      out.exclusiveMaximum = schema.maximum
      delete out.maximum
    }
  }

  if (Array.isArray(schema.items)) {
    out.prefixItems = schema.items.map(toFakerSchema)
    delete out.items
    delete out.additionalItems
    if (typeof schema.additionalItems === 'object') {
      out.items = toFakerSchema(schema.additionalItems)
    } else if (schema.additionalItems === false) {
      out.items = false
    }
  } else if (schema.items) {
    out.items = toFakerSchema(schema.items)
  }

  if (typeof schema.additionalProperties === 'object') {
    out.additionalProperties = toFakerSchema(schema.additionalProperties)
  }
  if (schema.not) out.not = toFakerSchema(schema.not)
  if (schema.properties) out.properties = toFakerSchemaMap(schema.properties)
  if (schema.patternProperties) {
    out.patternProperties = toFakerSchemaMap(schema.patternProperties)
  }
  if (schema.definitions) out.definitions = toFakerSchemaMap(schema.definitions)
  if (schema.dependencies) {
    out.dependencies = Object.fromEntries(
      Object.entries(schema.dependencies).map(([key, value]) => [
        key,
        Array.isArray(value) ? value : toFakerSchema(value),
      ])
    )
  }
  for (const key of ['allOf', 'anyOf', 'oneOf'] as const) {
    const list = schema[key]
    if (list) out[key] = list.map(toFakerSchema)
  }

  return out
}

const createGenerateOptions = (
  defs: SDCSchema['$defs'],
  jsonSchemaFakerOptions: GenerateOptions
): GenerateOptions => {
  const defsRecord = defs ?? {}
  const userRefResolver = jsonSchemaFakerOptions.refResolver

  if (Object.keys(defsRecord).length === 0 && !userRefResolver) {
    return jsonSchemaFakerOptions
  }

  return {
    ...jsonSchemaFakerOptions,
    refResolver: async (ref: string) => {
      const def = Object.prototype.hasOwnProperty.call(defsRecord, ref)
        ? defsRecord[ref]
        : undefined
      if (def) return toFakerSchema(def)

      if (userRefResolver) {
        return userRefResolver(ref)
      }

      // An unresolved ref generates nothing.
      return false
    },
  }
}

const generateArgs = (
  schema: Record<string, JSONSchema4> | undefined,
  defs: SDCSchema['$defs'],
  jsonSchemaFakerOptions: GenerateOptions
): Promise<Args> => {
  return Object.entries(schema ?? {}).reduce<Promise<Args>>(
    async (accPromise, [key, property]) => {
      const acc = await accPromise
      const schemaWithDefs: FakerSchema = {
        ...toFakerSchema(property),
        ...(defs ? { $defs: toFakerSchemaMap(defs) } : {}),
      }

      const value = await generate(schemaWithDefs, jsonSchemaFakerOptions)
      // An object for a non-object schema (an enum of objects) becomes its values.
      acc[key] =
        isRecord(value) && property.type !== 'object'
          ? Object.values(value)
          : value
      return acc
    },
    Promise.resolve({})
  )
}

const slotsToSchemaProperties = (
  slots: SlotDefinition
): Record<string, JSONSchema4> => {
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
