import { describe, expect, test } from 'vitest'
import Twig from 'twig'
import twing from 'twing'
import { htmlCva } from '../renderer/cva.ts'
import { createTwigRuntime } from '../renderer/twig.ts'
import { createTwingRuntime } from '../renderer/twing.ts'
// Data providers of twig/html-extra's CvaTest.php, converted to JSON.
import cases from './fixtures/twig-cva-cases.json' with { type: 'json' }

interface Recipe {
  base?: unknown
  variants?: unknown
  compounds?: unknown
  defaultVariants?: unknown
}

describe('html_cva matches Twig', () => {
  test.each(cases.recipes as Array<[string, [Recipe, unknown, string]]>)(
    '%s',
    (_name, [recipe, recipes, expected]) => {
      const cva = htmlCva(
        recipe.base ?? '',
        recipe.variants ?? [],
        recipe.compounds ?? [],
        recipe.defaultVariants ?? []
      )
      expect(cva.apply(recipes)).toBe(expected)
    }
  )

  test.each(
    cases.additionalClasses as Array<[string, [unknown, unknown, string]]>
  )('additional classes: %s', (_name, [base, additionals, expected]) => {
    const cva = htmlCva(base)
    const extra: unknown[] = Array.isArray(additionals)
      ? additionals
      : [additionals]
    expect(cva.apply([], ...extra)).toBe(expected)
  })

  const variants = {
    colors: { primary: 'text-primary', secondary: 'text-secondary' },
    sizes: { sm: 'text-sm', md: 'text-md', lg: 'text-lg' },
  }
  const compounds = [
    { colors: ['primary'], sizes: ['sm'], class: 'text-red-500' },
  ]

  test('apply with additional classes, skipping null', () => {
    const cva = htmlCva('font-semibold border rounded', variants, compounds)
    expect(
      cva.apply(
        { colors: 'primary', sizes: 'sm' },
        'flex',
        null,
        'justify-center'
      )
    ).toBe(
      'font-semibold border rounded text-primary text-sm text-red-500 flex justify-center'
    )
  })

  test('null recipe values fall back to defaults', () => {
    const cva = htmlCva('font-semibold', variants, [], { sizes: 'sm' })
    expect(cva.apply({ colors: null, sizes: null })).toBe(
      'font-semibold text-sm'
    )
  })

  // Output of Twig 3.x Cva::apply() for the same recipe.
  test.each([
    [
      { color: 'red', size: 'lg', disabled: true },
      [],
      'btn c-red s-lg off bold',
    ],
    [{ color: 'red' }, [], 'btn c-red s-lg on'],
    [{ size: 'sm', color: 'blue' }, [], 'btn s-sm c-blue on'],
    [{ color: 'red', size: null }, [], 'btn c-red s-lg on'],
    [{ color: 'blue' }, [], 'btn c-blue s-lg on'],
    [
      { color: 'red', size: 'lg' },
      ['extra', 'btn'],
      'btn c-red s-lg bold on extra',
    ],
  ])(
    'apply(%o) keeps recipe order and ignores defaults in compounds',
    (recipes, extra, expected) => {
      const cva = htmlCva(
        'btn',
        {
          color: { red: 'c-red', blue: 'c-blue' },
          size: { sm: 's-sm', lg: 's-lg' },
          disabled: { true: 'off', false: 'on' },
        },
        [{ color: ['red'], size: ['lg'], class: 'bold' }],
        { size: 'lg', disabled: false }
      )
      expect(cva.apply(recipes, ...extra)).toBe(expected)
    }
  )

  test('whitespace in classes is normalized and deduplicated', () => {
    const cva = htmlCva('font-semibold  border\nrounded border', variants)
    expect(cva.apply({ colors: 'primary' })).toBe(
      'font-semibold border rounded text-primary'
    )
    expect(cva.apply({ colors: 'secondary' })).toBe(
      'font-semibold border rounded text-secondary'
    )
  })
})

// Drupal core's sdc_theme_test cva component, plus compound and default variants.
const TEMPLATE = `{% set cva = html_cva(
  base: ['cva-friendliness'],
  variants: {
    friendliness: { nice: 'friendly', mean: 'unfriendly' },
    size: { sm: 'small', lg: 'large' }
  },
  compound_variants: [{ friendliness: ['mean'], size: 'lg', class: 'shouty' }],
  default_variant: { size: 'sm' }
) %}<div class="{{ cva.apply({ friendliness: friendliness, size: size }, extra) }}"></div>`

const CASES: Array<[Record<string, unknown>, string]> = [
  [{ friendliness: 'nice' }, 'cva-friendliness friendly small'],
  [
    { friendliness: 'mean', size: 'lg', extra: 'x' },
    'cva-friendliness unfriendly large shouty x',
  ],
]

describe('html_cva() in templates', () => {
  test.each(CASES)('twig.js %o', (context, expected) => {
    createTwigRuntime({}).registerSdcRuntime(Twig)
    expect(Twig.twig({ data: TEMPLATE }).render(context)).toBe(
      `<div class="${expected}"></div>`
    )
  })

  test.each(CASES)('Twing %o', (context, expected) => {
    const env = twing.createSynchronousEnvironment(
      twing.createSynchronousArrayLoader({ cva: TEMPLATE })
    )
    createTwingRuntime({}).registerSdcRuntime(env)
    expect(env.render('cva', context)).toBe(`<div class="${expected}"></div>`)
  })
})
