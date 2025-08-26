import { describe, expect, test } from 'vitest'
import { namespaceDefinition } from '../utils.ts'
describe('pathToNamespace', () => {
  test.each([
    ['/root/ds-a/components/component-a', '@ds-a/component-a'],
    ['/root/ds-b/ds-c/components/component-a', '@ds-c/component-a'],
    [
      '/root/ds-b/components/component-a/sub-component-b',
      '@ds-b/component-a/sub-component-b',
    ],
  ])('pathToNamespace(%s) -> expected: %s', (path, expected: string) => {
    const namespaces = namespaceDefinition({
      namespace: '',
      namespaces: {
        'ds-a': '/root/ds-a',
        'ds-c': '/root/ds-b/ds-c',
        'ds-b': '/root/ds-b',
      },
    })
    expect(namespaces.pathToNamespace(path)).toBe(expected)
  })
})
