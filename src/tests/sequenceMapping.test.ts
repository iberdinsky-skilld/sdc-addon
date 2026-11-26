import { describe, expect, test } from 'vitest'
import Twig from 'twig'
import twing from 'twing'
import { createTwigCore } from '../renderer/twig.ts'
import { createTwingCore } from '../renderer/twing.ts'

const CASES: Array<[string, Record<string, unknown>, string]> = [
  ["{{ ['a', 'b'] is sequence ? 'y' : 'n' }}", {}, 'y'],
  ["{{ {a: 1} is sequence ? 'y' : 'n' }}", {}, 'n'],
  ["{{ {a: 1} is mapping ? 'y' : 'n' }}", {}, 'y'],
  ["{{ ['a'] is mapping ? 'y' : 'n' }}", {}, 'n'],
  ["{{ [] is sequence ? 'y' : 'n' }}", {}, 'y'],
  ["{{ 'text' is sequence or 'text' is mapping ? 'y' : 'n' }}", {}, 'n'],
  ["{{ items is sequence ? 'y' : 'n' }}", { items: ['a'] }, 'y'],
  ["{{ (['a']|merge(x ?: [])) is sequence ? 'y' : 'n' }}", { x: [] }, 'y'],
]

describe('is sequence / is mapping', () => {
  test.each(CASES)('twig.js %s', (data, context, expected) => {
    createTwigCore({}).registerCore(Twig)
    expect(Twig.twig({ data }).render(context)).toBe(expected)
  })

  test.each(CASES)('Twing %s', (data, context, expected) => {
    const env = twing.createSynchronousEnvironment(
      twing.createSynchronousArrayLoader({ t: data })
    )
    createTwingCore({}).registerCore(env)
    expect(env.render('t', context)).toBe(expected)
  })
})
