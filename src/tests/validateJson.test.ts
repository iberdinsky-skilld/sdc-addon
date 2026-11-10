import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'

import { schemaUrlFor, validateJson } from '../generate/validate.ts'
import { DEFAULT_SCHEMA_URL } from '../constants.ts'
import { logger } from '../logger.ts'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  vi.resetAllMocks()
})

describe('validateJson', () => {
  test('fetchSchema caches fetched schemas (fetch called once)', async () => {
    const schemaUrl = 'https://example.com/schema.json'
    const schema = { type: 'object', properties: { name: { type: 'string' } } }

    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => schema })

    // first call should invoke fetch
    await validateJson({ name: 'x' } as any, schemaUrl)
    // second call with same url should use cache and not call fetch again
    await validateJson({ name: 'y' } as any, schemaUrl)

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  test('logs warning when validation has errors', async () => {
    const schemaUrl = 'https://example.com/schema2.json'
    const schema = {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    }

    fetchMock.mockResolvedValue({ ok: true, json: async () => schema })

    const warnSpy = vi.spyOn(logger, 'warn')

    // data missing required 'name' property
    await validateJson({} as any, schemaUrl)

    expect(warnSpy).toHaveBeenCalled()
  })

  test('throws when fetching schema fails', async () => {
    const schemaUrl = 'https://example.com/bad.json'
    fetchMock.mockResolvedValue({ ok: false, statusText: 'Not Found' })

    await expect(validateJson({} as any, schemaUrl)).rejects.toThrow()
  })

  test('resolves same-document $defs refs with a single fetch', async () => {
    const schemaUrl = 'https://example.com/self-ref.json'
    // jsonschema lists every #/$defs pointer as unresolved; the loop must
    // not re-fetch the same document for each of them.
    const schema = {
      type: 'object',
      properties: {
        a: { $ref: `${schemaUrl}#/$defs/thing` },
        b: { $ref: `${schemaUrl}#/$defs/thing` },
      },
      $defs: { thing: { type: 'string' } },
    }
    fetchMock.mockResolvedValue({ ok: true, json: async () => schema })
    const warnSpy = vi.spyOn(logger, 'warn')

    await validateJson({ name: 'x', a: 'ok', b: 1 } as any, schemaUrl)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(String(warnSpy.mock.calls[0][0])).toMatch(/instance\.b/)
  })

  test('validates props against the bundled draft-04 meta-schema', async () => {
    const schemaUrl = 'https://example.com/drupal-like.json'
    const schema = {
      type: 'object',
      properties: {
        props: { allOf: [{ $ref: 'http://json-schema.org/draft-04/schema#' }] },
      },
    }
    fetchMock.mockResolvedValue({ ok: true, json: async () => schema })
    const warnSpy = vi.spyOn(logger, 'warn')

    await validateJson(
      {
        name: 'ok',
        props: { type: 'object', properties: { t: { type: 'string' } } },
      } as any,
      schemaUrl
    )
    expect(warnSpy).not.toHaveBeenCalled()

    await validateJson(
      {
        name: 'bad',
        props: { type: 'object', properties: { t: { type: 'strin' } } },
      } as any,
      schemaUrl
    )
    expect(warnSpy).toHaveBeenCalledTimes(1)
    // The meta-schema is bundled: no network request for it.
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  test('schemaUrlFor picks the component $schema, the option, or the Drupal default', () => {
    expect(schemaUrlFor({}, false)).toBeUndefined()
    expect(schemaUrlFor({}, undefined)).toBeUndefined()
    expect(schemaUrlFor({}, '')).toBeUndefined()
    expect(schemaUrlFor({}, true)).toBe(DEFAULT_SCHEMA_URL)
    expect(schemaUrlFor({}, 'https://x/s.json')).toBe('https://x/s.json')
    expect(schemaUrlFor({ $schema: 'https://own/s.json' }, true)).toBe(
      'https://own/s.json'
    )
    expect(
      schemaUrlFor({ $schema: 'https://own/s.json' }, 'https://x/s.json')
    ).toBe('https://own/s.json')
  })
})
