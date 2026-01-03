import { describe, expect, test } from 'vitest'
import componentMetadata from '../componentMetadata'
import { cwd } from 'node:process'
import { dirname, relative } from 'node:path'

describe('componentMetadata', () => {
  test('returns correct metadata for given id and content', () => {
    const id = `${cwd()}/components/atoms/button/button.component.yml`
    const content: any = {
      name: 'Button',
      status: 'deprecated',
      group: 'atoms',
    }

    const meta = componentMetadata(id, content)

    const expectedPath = relative(cwd(), dirname(id))
    expect(meta.path).toBe(expectedPath)
    expect(meta.machineName).toBe(id)
    expect(meta.status).toBe('deprecated')
    expect(meta.name).toBe('Button')
    expect(meta.group).toBe('atoms')
  })

  test('defaults status to stable when missing', () => {
    const id = `${cwd()}/components/pkg/x/x.component.yml`
    const content: any = { name: 'X', group: 'pkg' }

    const meta = componentMetadata(id, content)
    expect(meta.status).toBe('stable')
  })
})
