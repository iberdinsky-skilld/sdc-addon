import { describe, expect, test } from 'vitest'
import { copyFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  cssValue,
  cssVariableName,
  designTokensCss,
} from '../generate/designTokens.ts'

// Cases from core's design token unit tests.
describe('cssVariableName', () => {
  test.each([
    ['myPath', '--myPath'],
    ['my_token_path', '--my-token-path'],
    ['my token path', '--my-token-path'],
    ['my.token.path', '--my-token-path'],
  ])('%s', (path, expected) => {
    expect(cssVariableName(path)).toBe(expected)
  })
})

describe('cssValue', () => {
  test.each<[string, unknown, string]>([
    ['dimension', { value: 12, unit: 'px' }, '12px'],
    ['dimension', { value: 2, unit: 'rem' }, '2rem'],
    ['fontFamily', 'Arial', 'Arial'],
    ['fontFamily', ['Arial', 'sans-serif'], 'Arial, sans-serif'],
    [
      'fontFamily',
      ['Arial', '<script>alert()</script>'],
      'Arial, &lt;script&gt;alert()&lt;/script&gt;',
    ],
    ['fontWeight', 'regular', '400'],
    ['fontWeight', 'extra-black', '950'],
    ['fontWeight', 50, '50'],
    ['number', 50, '50'],
    ['number', 4.2, '4.2'],
    [
      'typography',
      {
        fontFamily: ['Arial', 'sans-serif'],
        fontSize: { value: 10, unit: 'px' },
        fontWeight: 20,
        letterSpacing: { value: 30, unit: 'px' },
        lineHeight: 5,
      },
      '20 10px/5 Arial, sans-serif',
    ],
    ['color', '#7c3aed', '#7c3aed'],
    [
      'color',
      { colorSpace: 'srgb', components: [1, 0, 0], hex: '#ff0000' },
      '#ff0000',
    ],
    ['color', '{color.palette.violet}', 'var(--color-palette-violet)'],
  ])('%s %j', (type, value, expected) => {
    expect(cssValue(type, value)).toBe(expected)
  })
})

describe('designTokensCss', () => {
  test("renders core's test tokens file as :root variables", () => {
    const root = mkdtempSync(join(tmpdir(), 'sdc-tokens-'))
    try {
      copyFileSync(
        join(import.meta.dirname, 'fixtures/drupal-design-tokens.tokens.yml'),
        join(root, 'mytheme.tokens.yml')
      )
      const css = designTokensCss({ entries: () => [['mytheme', root]] })
      expect(css).toBe(
        ':root{' +
          '--color-palette-violet:#7c3aed;' +
          '--color-palette-rose:#e11d48;' +
          '--color-semantic-primary:var(--color-palette-violet);' +
          '--color-semantic-secondary:var(--color-palette-rose);' +
          '--fontSize-small:12px;' +
          '--fontSize-medium:16px;' +
          '--fontSize-large:24px;' +
          '--font-family-Primary-font:Comic Sans MS;' +
          '--font-family-Body-font:Helvetica, Arial, sans-serif;' +
          '--fontWeight-light:300;' +
          '--fontWeight-normal:400;' +
          '--fontWeight-bold:600;' +
          '--spacing-small:12px;' +
          '--spacing-medium:16px;' +
          '--spacing-large:20px;' +
          '--type-styles-heading-level-1:700 42px/1.2 Roboto;' +
          '}'
      )
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  test('is empty without token files', () => {
    expect(designTokensCss({ entries: () => [] })).toBe('')
  })
})
