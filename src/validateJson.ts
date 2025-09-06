import { Validator } from 'jsonschema'
import fetch from 'node-fetch'
import type { JSONSchema4 } from 'json-schema'
import { logger } from './logger.ts'
import type { SDCSchema } from './sdc'

const validator = new Validator()

// Cache to store already fetched schemas
const schemaCache: Map<string, JSONSchema4> = new Map()

/**
 * Fetch a JSON schema from a URL, using cache to avoid redundant fetches.
 *
 * @param url - The URL of the JSON schema.
 * @returns The fetched JSON schema.
 */
const fetchSchema = async (url: string): Promise<JSONSchema4> => {
  // Check if the schema is already cached

  if (schemaCache.has(url)) {
    return schemaCache.get(url)!
  }

  // Fetch the schema from the URL if not in cache
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch schema: ${response.statusText}`)
    }

    const schema = (await response.json()) as JSONSchema4

    // Cache the fetched schema
    schemaCache.set(url, schema)

    return schema
  } catch (error) {
    logger.error('Error fetching schema:', error)
    throw new Error(`Could not fetch schema from ${url}`)
  }
}

/**
 * Validate a JSON object against a schema, handling external references.
 *
 * @param data - The JSON object to validate.
 * @param schemaUrl - The URL of the JSON schema.
 * @returns True if valid; throws an error if invalid.
 */
export const validateJson = async (
  data: SDCSchema,
  schemaUrl: string
): Promise<void> => {
  // Fetch the root schema and add it to the validator
  const rootSchema = await fetchSchema(schemaUrl)
  validator.addSchema(rootSchema, schemaUrl)

  // Recursively fetch and add any unresolved references
  const unresolvedRefs = validator.unresolvedRefs
  while (unresolvedRefs.length > 0) {
    const refUrl = unresolvedRefs.shift()!
    const schema = await fetchSchema(refUrl)
    validator.addSchema(schema, refUrl)
  }

  // Perform validation
  const validationResult = validator.validate(data, rootSchema)
  if (validationResult.errors.length > 0) {
    logger.warn(`
${data.name}.component.yml has validation errors:
${validationResult.errors.map((error) => error.stack).join('\n')}
    `)
  }
}
