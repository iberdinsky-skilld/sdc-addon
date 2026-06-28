import { describe, expect, test } from 'vitest'
import DrupalAttribute from 'drupal-attribute'
import { entries } from '../renderer/collections.ts'

describe('entries', () => {
  test('null / undefined → []', () => {
    expect(entries(null)).toEqual([])
    expect(entries(undefined)).toEqual([])
  })

  test('Map → its entries', () => {
    expect(entries(new Map([['a', 1]]))).toEqual([['a', 1]])
  })

  test('DrupalAttribute (a Map subclass) → its key/value entries', () => {
    const a = new DrupalAttribute([
      ['class', ['x']],
      ['id', 'y'],
    ])
    expect(entries(a)).toEqual([
      ['class', ['x']],
      ['id', 'y'],
    ])
  })

  test('array → index/value pairs', () => {
    expect(entries(['a', 'b'])).toEqual([
      [0, 'a'],
      [1, 'b'],
    ])
  })

  test('plain object → Object.entries', () => {
    expect(entries({ a: 1, b: 2 })).toEqual([
      ['a', 1],
      ['b', 2],
    ])
  })

  test('primitive → []', () => {
    expect(entries('x')).toEqual([])
    expect(entries(5)).toEqual([])
  })
})
