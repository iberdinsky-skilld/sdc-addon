import { Validator } from 'jsonschema'
import type { JSONSchema4 } from 'json-schema'
import { logger } from '../logger.ts'
import type { SDCSchema } from '../sdc.d.ts'
import { DEFAULT_SCHEMA_URL } from '../constants.ts'
// Vendored copy of http://json-schema.org/draft-04/schema (JSON Schema
// specification meta-schema). Drupal's component schema validates `props`
// against it, and jsonschema does not bundle any meta-schema.
import draft04 from './draft-04.schema.json' with { type: 'json' }

const DRAFT04_ID = 'http://json-schema.org/draft-04/schema'

// jsonschema reports every `#/$defs/...` pointer of a document as unresolved,
// so an unbounded loop over `unresolvedRefs` never ends. One fetch per
// distinct document is enough; the bound is a safety net.
const MAX_REF_ROUNDS = 20

// Promises are cached, so concurrent validations share one request per URL.
const schemaCache = new Map<string, Promise<JSONSchema4>>()

const fetchSchema = (url: string): Promise<JSONSchema4> => {
  let pending = schemaCache.get(url)
  if (!pending) {
    pending = (async () => {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch schema ${url}: ${response.statusText}`)
      }
      return (await response.json()) as JSONSchema4
    })()
    pending.catch(() => schemaCache.delete(url))
    schemaCache.set(url, pending)
  }
  return pending
}

// The schema a component is validated against for a given `validate` option:
// the component's own `$schema` wins; otherwise the URL passed as the option,
// or Drupal's schema when the option is just `true`. `false` disables.
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
  validator.addSchema(draft04 as JSONSchema4, DRAFT04_ID)

  const rootSchema = await fetchSchema(schemaUrl)
  validator.addSchema(rootSchema, schemaUrl)

  const loaded = new Set([schemaUrl, DRAFT04_ID])
  for (
    let round = 0;
    validator.unresolvedRefs.length > 0 && round < MAX_REF_ROUNDS;
    round++
  ) {
    const ref = validator.unresolvedRefs.shift()!
    const document = ref.split('#')[0]
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
