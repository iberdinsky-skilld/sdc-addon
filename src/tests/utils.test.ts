import { describe, expect, test } from 'vitest'
import {
  capitalize,
  convertToKebabCase,
  toAttributes,
  deriveGroupFromPath,
  sanitizeStoryKey,
} from '../utils.ts'
import { join } from 'node:path'

describe('utils', () => {
  test('capitalize capitalizes first letter', () => {
    expect(capitalize('hello')).toBe('Hello')
    expect(capitalize('h')).toBe('H')
  })

  test('convertToKebabCase removes colons and dashes', () => {
    expect(convertToKebabCase('umami:card')).toBe('umamicard')
    expect(convertToKebabCase('some-name')).toBe('somename')
    expect(convertToKebabCase('a-b:c')).toBe('abc')
  })

  test('toAttributes formats attributes correctly', () => {
    expect(toAttributes(undefined)).toBe('')
    expect(toAttributes({})).toBe(' ')
    expect(toAttributes({ class: ['a', 'b'] })).toBe(' class="a b"')
    expect(toAttributes({ id: 'main', title: 'ok' })).toBe(
      ' id="main" title="ok"'
    )
  })

  test('deriveGroupFromPath extracts group or falls back to SDC', () => {
    const p1 = join(
      '/root',
      'components',
      'atoms',
      'button',
      'button.component.yml'
    )
    expect(deriveGroupFromPath(p1)).toBe('atoms')

    const p2 = join('/root', 'components', 'dummy', 'dummy.component.yml')
    expect(deriveGroupFromPath(p2)).toBe('SDC')
  })

  test('sanitizeStoryKey prefixes numeric keys', () => {
    expect(sanitizeStoryKey('1test')).toBe('_1test')
    expect(sanitizeStoryKey('test')).toBe('test')
  })
})
