import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'

// Mock node-fetch before importing validateJson
vi.mock('node-fetch', () => ({ default: vi.fn() }))

import fetch from 'node-fetch'
import { validateJson } from '../validateJson.ts'
import { logger } from '../logger.ts'

const fetchMock = fetch as unknown as any

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
})
