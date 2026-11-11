import { describe, expect, test } from 'vitest'
import {
  capitalize,
  toIdentifier,
  deriveGroupFromPath,
  isRemoteUrl,
  jsLiteral,
  mergeOptions,
  sanitizeStoryKey,
} from '../utils.ts'
import { join } from 'node:path'

describe('utils', () => {
  test('capitalize capitalizes first letter', () => {
    expect(capitalize('hello')).toBe('Hello')
    expect(capitalize('h')).toBe('H')
  })

  test('capitalize leaves an empty string empty', () => {
    expect(capitalize('')).toBe('')
  })

  test('toIdentifier turns a component id into a JS identifier', () => {
    expect(toIdentifier('umami:card')).toBe('umamicard')
    expect(toIdentifier('umami:read-more')).toBe('umamireadmore')
    expect(toIdentifier('a-b:c')).toBe('abc')
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

  test('mergeOptions merges nested plain objects and keeps defaults', () => {
    interface Options {
      sdcStorybookOptions: {
        twigLib?: string
        validate?: boolean
        useBasic?: boolean
        namespace?: string
      }
      jsonSchemaFakerOptions: { useExamplesValue?: boolean }
    }
    const defaults: Options = {
      sdcStorybookOptions: { twigLib: 'twig', validate: false, useBasic: true },
      jsonSchemaFakerOptions: { useExamplesValue: true },
    }
    const merged = mergeOptions(defaults, {
      sdcStorybookOptions: { validate: true, namespace: 'umami' },
    })
    expect(merged.sdcStorybookOptions).toEqual({
      twigLib: 'twig',
      validate: true,
      useBasic: true,
      namespace: 'umami',
    })
    expect(merged.jsonSchemaFakerOptions).toEqual({ useExamplesValue: true })
  })

  test('mergeOptions replaces arrays and non-plain values, ignores undefined', () => {
    const fn = () => 'x'
    const defaults = {
      list: [1, 2],
      include: /\.twig$/,
      nested: { keep: 1 },
      hook: undefined as unknown,
    }
    const merged = mergeOptions(defaults, {
      list: [3],
      include: /\.html$/,
      nested: undefined,
      hook: fn,
    })
    expect(merged.list).toEqual([3])
    expect(merged.include).toEqual(/\.html$/)
    expect(merged.nested).toEqual({ keep: 1 })
    expect(merged.hook).toBe(fn)
  })

  test('mergeOptions does not mutate its inputs', () => {
    const defaults: { a: { b?: number; c?: number } } = { a: { b: 1 } }
    const overrides = { a: { c: 2 } }
    const merged = mergeOptions(defaults, overrides)
    expect(merged).toEqual({ a: { b: 1, c: 2 } })
    expect(defaults).toEqual({ a: { b: 1 } })
    expect(overrides).toEqual({ a: { c: 2 } })
  })

  test('isRemoteUrl accepts only http(s) URLs', () => {
    expect(isRemoteUrl('https://cdn.example/icon.svg')).toBe(true)
    expect(isRemoteUrl('http://localhost:6006/x')).toBe(true)
    expect(isRemoteUrl('ftp://host/file')).toBe(false)
    expect(isRemoteUrl('icons/svg')).toBe(false)
    expect(isRemoteUrl('http-icons/star.svg')).toBe(false)
    expect(isRemoteUrl('/libraries/heroicons')).toBe(false)
  })
})
