import { describe, expect, test } from 'vitest'
import { DEFAULT_ADDON_OPTIONS } from '../constants'

describe('DEFAULT_ADDON_OPTIONS', () => {
  test('contains sdcStorybookOptions with sensible defaults', () => {
    const opts: any = DEFAULT_ADDON_OPTIONS
    expect(opts.sdcStorybookOptions).toBeTruthy()
    expect(opts.sdcStorybookOptions.useBasicArgsForStories).toBe(true)
    expect(opts.sdcStorybookOptions.twigLib).toBe('twig')
    expect(opts.sdcStorybookOptions.validate).toBe(false)
  })

  test('includes jsonSchemaFakerOptions with expected flags', () => {
    const jsf: any = DEFAULT_ADDON_OPTIONS.jsonSchemaFakerOptions
    expect(jsf).toBeTruthy()
    expect(jsf.ignoreMissingRefs).toBe(true)
    expect(jsf.useExamplesValue).toBe(true)
    expect(jsf.useDefaultValue).toBe(true)
  })
})
