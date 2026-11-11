import { describe, expect, test, vi } from 'vitest'
import type { JSONSchema4 } from 'json-schema'

import { loadAndMergeDefinitions } from '../generate/definitions.ts'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { logger } from '../logger.ts'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

describe('definitions.loadExternalDef / loadAndMergeDefinitions', () => {
  test('loads local YAML file and merges definitions', async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-def-'))
    try {
      const file = join(tmpRoot, 'defs.yml')
      const content = `MyComponent:\n  type: object\n  properties:\n    name:\n      type: string\n`
      writeFileSync(file, content, 'utf8')

      const merged = await loadAndMergeDefinitions([file], undefined)
      expect(merged).toHaveProperty('MyComponent')
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('fetches remote YAML and merges definitions', async () => {
    const yaml = `RemoteComponent:\n  type: object\n`
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(yaml),
    })

    const merged = await loadAndMergeDefinitions(
      ['https://example.com/defs.yml'],
      undefined
    )
    expect(fetchMock).toHaveBeenCalled()
    expect(merged).toHaveProperty('RemoteComponent')
  })

  test('throws and logs error when remote fetch fails', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, statusText: 'Not Found' })
    const spy = vi.spyOn(logger, 'error')

    await expect(
      loadAndMergeDefinitions(['https://bad.example/defs.yml'], undefined)
    ).rejects.toThrow()
    expect(spy).toHaveBeenCalled()
  })

  test('merges customDefs into global defs', async () => {
    const custom: Record<string, JSONSchema4> = { MyCustom: { type: 'object' } }
    const merged = await loadAndMergeDefinitions(undefined, custom)
    expect(merged).toHaveProperty('MyCustom')
  })

  test('remote fetch returns invalid YAML -> logs error and rejects', async () => {
    const bad = '::: not yaml :::'
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(bad),
    })
    const spy = vi.spyOn(logger, 'error')

    await expect(
      loadAndMergeDefinitions(['https://example.com/bad.yml'], undefined)
    ).rejects.toThrow()

    expect(spy).toHaveBeenCalled()
  })
})
