import { describe, expect, test, vi } from 'vitest'

// Mock node-fetch before importing module under test
vi.mock('node-fetch', () => ({ default: vi.fn() }))
import fetch from 'node-fetch'

import { loadAndMergeDefinitions } from '../definitions.ts'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { logger } from '../logger.ts'

const fetchMock = fetch as unknown as any

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
    fetchMock.mockResolvedValueOnce({ ok: true, text: async () => yaml })

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
    const custom = { MyCustom: { type: 'object' } } as any
    const merged = await loadAndMergeDefinitions(undefined, custom)
    expect(merged).toHaveProperty('MyCustom')
  })

  test('remote fetch returns invalid YAML -> logs error and rejects', async () => {
    const bad = '::: not yaml :::'
    fetchMock.mockResolvedValueOnce({ ok: true, text: async () => bad })
    const spy = vi.spyOn(logger, 'error')

    await expect(
      loadAndMergeDefinitions(['https://example.com/bad.yml'], undefined)
    ).rejects.toThrow()

    expect(spy).toHaveBeenCalled()
  })
})
