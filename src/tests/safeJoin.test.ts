import { describe, expect, test } from 'vitest'
import twing from 'twing'
import { addDrupalExtensions } from '@christianwiedemann/drupal-twig-extensions/twing'
import { createTwingRuntime } from '../renderer/twing.ts'

const render = (data: string, context: Record<string, unknown>): string => {
  const env = twing.createSynchronousEnvironment(
    twing.createSynchronousArrayLoader({ t: data })
  )
  addDrupalExtensions(env)
  createTwingRuntime({}).registerSdcRuntime(env)
  return env.render('t', context)
}

describe('|safe_join on Twing', () => {
  test.each([
    [null, ''],
    [undefined, ''],
    [['a', 'b'], 'a | b'],
    [['<b>x</b>'], '<b>x</b>'],
  ])('%j', (value, expected) => {
    expect(render("{{ v|safe_join(' | ') }}", { v: value })).toBe(expected)
  })
})
