import { describe, expect, test } from 'vitest'
import { DEFAULT_ADDON_OPTIONS, TWIG_FILE_RE } from '../constants'

describe('DEFAULT_ADDON_OPTIONS', () => {
  test('contains sdcStorybookOptions with sensible defaults', () => {
    const opts = DEFAULT_ADDON_OPTIONS
    expect(opts.sdcStorybookOptions).toBeTruthy()
    expect(opts.sdcStorybookOptions.useBasicArgsForStories).toBe(true)
    expect(opts.sdcStorybookOptions.twigLib).toBe('twig')
    expect(opts.sdcStorybookOptions.validate).toBe(false)
  })

  test('includes jsonSchemaFakerOptions with expected flags', () => {
    const jsf = DEFAULT_ADDON_OPTIONS.jsonSchemaFakerOptions
    expect(jsf).toBeDefined()
    expect(jsf?.failOnInvalidTypes).toBe(false)
    expect(jsf?.useExamplesValue).toBe(true)
    expect(jsf?.useDefaultValue).toBe(true)
  })
})

describe('TWIG_FILE_RE', () => {
  test.each(['a/card.twig', 'a/card.twig?import', 'a/card.twig?t=123'])(
    'matches %s',
    (id) => expect(TWIG_FILE_RE.test(id)).toBe(true)
  )

  test.each(['a/card.twig?raw', 'a/card.twig.yml'])('skips %s', (id) =>
    expect(TWIG_FILE_RE.test(id)).toBe(false)
  )

  test('is the twig.js plugin pattern', () => {
    expect(DEFAULT_ADDON_OPTIONS.vitePluginTwigDrupalOptions?.pattern).toBe(
      TWIG_FILE_RE
    )
  })
})
