import { describe, expect, test } from 'vitest'
import {
  capitalize,
  convertToKebabCase,
  deriveGroupFromPath,
  jsLiteral,
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

  test('jsLiteral escapes line separators and keeps values intact', () => {
    const value = 'a\u2028b\u2029c<d>'
    const code = jsLiteral(value)
    expect(code).not.toMatch(/[\u2028\u2029]/)
    expect(code).toContain('\\u2028')
    expect(JSON.parse(code)).toBe(value)
  })

  test('jsLiteral keeps JSON.stringify formatting and undefined handling', () => {
    expect(jsLiteral({ a: 1 }, 2)).toBe(JSON.stringify({ a: 1 }, null, 2))
    expect(jsLiteral(undefined)).toBe('undefined')
  })
})
