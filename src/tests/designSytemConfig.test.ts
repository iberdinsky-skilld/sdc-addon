import { describe, expect, test } from 'vitest'
import { toDesignSystemConfig } from '../utils.ts'
describe('pathToNamespace', () => {
  test.each([
    ['/root/ds-a/components/component-a', '@ds-a/component-a'],
    [
      '/root/ds-b/components/component-a/sub-component-b',
      '@ds-b/component-a/sub-component-b',
    ],
  ])('pathToNamespace(%s) -> expected: %s', (path, expected: string) => {
    const designSystemConfig = toDesignSystemConfig({
      namespace: '',
      designSystems: [
        { path: '/root/ds-a', namespace: 'ds-a' },
        { path: '/root/ds-b', namespace: 'ds-b' },
      ],
    })
    expect(designSystemConfig.pathToNamespace(path)).toBe(expected)
  })
})
