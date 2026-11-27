import { describe, expect, test } from 'vitest'
import Twig from 'twig'
import twing from 'twing'
import { createTwigRuntime } from '../renderer/twig.ts'
import { createTwingRuntime } from '../renderer/twing.ts'

const CASES: Array<[string, Record<string, unknown>, string]> = [
  ["{{ ['a', 'b'] is sequence ? 'y' : 'n' }}", {}, 'y'],
  ["{{ {a: 1} is sequence ? 'y' : 'n' }}", {}, 'n'],
  ["{{ {a: 1} is mapping ? 'y' : 'n' }}", {}, 'y'],
  ["{{ ['a'] is mapping ? 'y' : 'n' }}", {}, 'n'],
  ["{{ [] is sequence ? 'y' : 'n' }}", {}, 'y'],
  ["{{ 'text' is sequence or 'text' is mapping ? 'y' : 'n' }}", {}, 'n'],
  ["{{ items is sequence ? 'y' : 'n' }}", { items: ['a'] }, 'y'],
  ["{{ (['a']|merge(x ?: [])) is sequence ? 'y' : 'n' }}", { x: [] }, 'y'],
  ["{{ ['b', 'a', 'c']|shuffle|sort|join(',') }}", {}, 'a,b,c'],
  ["{{ {x: 1, y: 2}|shuffle|keys|join(',') }}", {}, '0,1'],
  ["{{ ['a', 'b', 'c']|shuffle|slice(0, 2)|length }}", {}, '2'],
  ["{% for c in ['a']|shuffle %}{{ c }}{% endfor %}", {}, 'a'],
  ["{{ 'abc'|shuffle|length }}", {}, '3'],
]

describe('Twig 3.11: is sequence, is mapping, |shuffle', () => {
  test.each(CASES)('twig.js %s', (data, context, expected) => {
    createTwigRuntime({}).registerSdcRuntime(Twig)
    expect(Twig.twig({ data }).render(context)).toBe(expected)
  })

  test.each(CASES)('Twing %s', (data, context, expected) => {
    const env = twing.createSynchronousEnvironment(
      twing.createSynchronousArrayLoader({ t: data })
    )
    createTwingRuntime({}).registerSdcRuntime(env)
    expect(env.render('t', context)).toBe(expected)
  })
})
