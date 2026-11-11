import { Validator, type Schema } from 'jsonschema'
import { logger } from '../logger.ts'
import { isRecord } from '../guards.ts'
import type { SDCSchema } from '../sdc.d.ts'
import { DEFAULT_SCHEMA_URL } from '../constants.ts'
// Vendored draft-04 meta-schema: Drupal validates `props` against it and
// jsonschema bundles none.
import draft04 from './draft-04.schema.json' with { type: 'json' }

const DRAFT04_ID = 'http://json-schema.org/draft-04/schema'

// jsonschema keeps every `#/$defs/...` pointer unresolved, so each document is
// fetched once and the loop is bounded.
const MAX_REF_ROUNDS = 20

// Promises are cached, so concurrent validations share one request per URL.
const schemaCache = new Map<string, Promise<Schema>>()

const fetchSchema = (url: string): Promise<Schema> => {
  let pending = schemaCache.get(url)
  if (!pending) {
    pending = (async () => {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch schema ${url}: ${response.statusText}`)
      }
      const schema: unknown = await response.json()
      if (!isRecord(schema)) {
        throw new Error(`Schema ${url} is not a JSON object`)
      }
      return schema
    })()
    pending.catch(() => schemaCache.delete(url))
    schemaCache.set(url, pending)
  }
  return pending
}

// Schema URL for a component: its own `$schema`, else the `validate` URL, or
// Drupal's schema for `true`.
export const schemaUrlFor = (
  content: Pick<SDCSchema, '$schema'>,
  validate: string | boolean | undefined
): string | undefined => {
  if (validate === true) return content.$schema || DEFAULT_SCHEMA_URL
  if (typeof validate === 'string' && validate)
    return content.$schema || validate
  return undefined
}

// Validate against a schema URL, resolving the external $refs it pulls in.
export const validateJson = async (
  data: SDCSchema,
  schemaUrl: string
): Promise<void> => {
  const validator = new Validator()
  validator.addSchema(draft04, DRAFT04_ID)

  const rootSchema = await fetchSchema(schemaUrl)
  validator.addSchema(rootSchema, schemaUrl)

  const loaded = new Set([schemaUrl, DRAFT04_ID])
  for (
    let round = 0;
    validator.unresolvedRefs.length > 0 && round < MAX_REF_ROUNDS;
    round++
  ) {
    const document = validator.unresolvedRefs.shift()?.split('#')[0]
    if (!document || loaded.has(document)) continue
    loaded.add(document)
    validator.addSchema(await fetchSchema(document), document)
  }

  const result = validator.validate(data, rootSchema)
  if (result.errors.length > 0) {
    logger.warn(
      `${data.name}.component.yml has validation errors:\n${result.errors
        .map((error) => error.stack)
        .join('\n')}`
    )
  }
}
