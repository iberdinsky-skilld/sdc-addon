import { describe, expect, test, vi, beforeEach } from 'vitest'

import { schemaUrlFor, validateJson } from '../generate/validate.ts'
import { DEFAULT_SCHEMA_URL } from '../constants.ts'
import { logger } from '../logger.ts'
import type { SDCSchema } from '../sdc.d.ts'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  vi.resetAllMocks()
})

describe('validateJson', () => {
  test('fetchSchema caches fetched schemas (fetch called once)', async () => {
    const schemaUrl = 'https://example.com/schema.json'
    const schema = { type: 'object', properties: { name: { type: 'string' } } }

    fetchMock.mockResolvedValueOnce({ ok: true, json: () => schema })

    await validateJson({ name: 'x' }, schemaUrl)
    // The cached schema is reused.
    await validateJson({ name: 'y' }, schemaUrl)

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  test('logs warning when validation has errors', async () => {
    const schemaUrl = 'https://example.com/schema2.json'
    const schema = {
      type: 'object',
      properties: { name: { type: 'string' }, title: { type: 'string' } },
      required: ['name', 'title'],
    }

    fetchMock.mockResolvedValue({ ok: true, json: () => schema })

    const warnSpy = vi.spyOn(logger, 'warn')

    // data missing the required 'title' property
    await validateJson({ name: 'untitled' }, schemaUrl)

    expect(warnSpy).toHaveBeenCalled()
  })

  test('throws when fetching schema fails', async () => {
    const schemaUrl = 'https://example.com/bad.json'
    fetchMock.mockResolvedValue({ ok: false, statusText: 'Not Found' })

    await expect(validateJson({ name: 'x' }, schemaUrl)).rejects.toThrow()
  })

  test('resolves same-document $defs refs with a single fetch', async () => {
    const schemaUrl = 'https://example.com/self-ref.json'
    // Every #/$defs pointer is reported unresolved; the document is fetched once.
    const schema = {
      type: 'object',
      properties: {
        a: { $ref: `${schemaUrl}#/$defs/thing` },
        b: { $ref: `${schemaUrl}#/$defs/thing` },
      },
      $defs: { thing: { type: 'string' } },
    }
    fetchMock.mockResolvedValue({ ok: true, json: () => schema })
    const warnSpy = vi.spyOn(logger, 'warn')

    const data = { name: 'x', a: 'ok', b: 1 }
    await validateJson(data, schemaUrl)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(String(warnSpy.mock.calls[0]?.[0])).toMatch(/instance\.b/)
  })

  test('validates props against the bundled draft-04 meta-schema', async () => {
    const schemaUrl = 'https://example.com/drupal-like.json'
    const schema = {
      type: 'object',
      properties: {
        props: { allOf: [{ $ref: 'http://json-schema.org/draft-04/schema#' }] },
      },
    }
    fetchMock.mockResolvedValue({ ok: true, json: () => schema })
    const warnSpy = vi.spyOn(logger, 'warn')

    const ok: SDCSchema = {
      name: 'ok',
      props: { type: 'object', properties: { t: { type: 'string' } } },
    }
    await validateJson(ok, schemaUrl)
    expect(warnSpy).not.toHaveBeenCalled()

    // minLength must be a non-negative integer per the draft-04 meta-schema.
    const bad: SDCSchema = {
      name: 'bad',
      props: { type: 'object', properties: { t: { minLength: -1 } } },
    }
    await validateJson(bad, schemaUrl)
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
