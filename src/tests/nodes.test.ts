import { describe, expect, test } from 'vitest'
import { PrintableArray } from '../renderer/nodes.ts'

describe('PrintableArray', () => {
  test('exposes only its items to key-based iteration', () => {
    // twig.js loops over Object.keys(); `length` must not show up as an item.
    const pa = new PrintableArray('a', 'b', 'c')
    expect(Object.keys(pa)).toEqual(['0', '1', '2'])
    expect(pa.length).toBe(3)
    expect(String(pa)).toBe('abc')
  })

  test('stays iterable', () => {
    expect([...new PrintableArray('a', 'b')]).toEqual(['a', 'b'])
  })
})
