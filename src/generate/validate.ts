import { Validator } from 'jsonschema'
import fetch from 'node-fetch'
import type { JSONSchema4 } from 'json-schema'
import { logger } from '../logger.ts'
import type { SDCSchema } from '../sdc.d.ts'

const validator = new Validator()

const schemaCache: Map<string, JSONSchema4> = new Map()

const fetchSchema = async (url: string): Promise<JSONSchema4> => {
  if (schemaCache.has(url)) {
    return schemaCache.get(url)!
  }
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch schema: ${response.statusText}`)
    }
    const schema = (await response.json()) as JSONSchema4
    schemaCache.set(url, schema)
    return schema
  } catch (error) {
    logger.error({ err: error }, 'Error fetching schema')
    throw new Error(`Could not fetch schema from ${url}`)
  }
}

// Validate against a schema URL, resolving any external $refs it pulls in.
export const validateJson = async (
  data: SDCSchema,
  schemaUrl: string
): Promise<void> => {
  const rootSchema = await fetchSchema(schemaUrl)
  validator.addSchema(rootSchema, schemaUrl)

  const unresolvedRefs = validator.unresolvedRefs
  while (unresolvedRefs.length > 0) {
    const refUrl = unresolvedRefs.shift()!
    const schema = await fetchSchema(refUrl)
    validator.addSchema(schema, refUrl)
  }

  const validationResult = validator.validate(data, rootSchema)
  if (validationResult.errors.length > 0) {
    logger.warn(`
${data.name}.component.yml has validation errors:
${validationResult.errors.map((error) => error.stack).join('\n')}
    `)
  }
}
