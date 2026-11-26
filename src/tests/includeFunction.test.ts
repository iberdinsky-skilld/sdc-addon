import { describe, expect, test } from 'vitest'
import Twig from 'twig'
import { createTwigCore } from '../renderer/twig.ts'

describe('include() on twig.js', () => {
  createTwigCore({}).registerCore(Twig)
  Twig.twig({
    id: 'umami:badge',
    data: '<span{{ attributes }}>{{ label }}{{ page }}</span>',
    allowInlineIncludes: true,
  })
  const render = (data: string, context: Record<string, unknown> = {}) =>
    Twig.twig({ data, allowInlineIncludes: true }).render(context)

  test.each([
    ["{{ include('umami:badge', { label: 'A' }) }}", '<span>A1</span>'],
    ["{{ include('umami:badge', { label: 'A' }, false) }}", '<span>A</span>'],
    [
      "{{ include('umami:badge', { label: 'A' }, with_context: false) }}",
      '<span>A</span>',
    ],
    ["{{ include('missing', {}, true, true) }}", ''],
    [
      "{{ include('umami:badge', { attributes: { class: ['x'] }, label: 'B' }, false) }}",
      '<span class="x">B</span>',
    ],
  ])('%s', (data, expected) => {
    expect(render(data, { page: 1 })).toBe(expected)
  })
})
