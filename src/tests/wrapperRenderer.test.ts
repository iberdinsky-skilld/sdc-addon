import { describe, expect, test } from 'vitest'
import { createWrapperEnv } from '../renderer/wrapper.ts'

const BADGE =
  "{% set attributes = attributes.addClass('badge') %}" +
  '<span{{ attributes }}>{{ label }}</span>'

for (const lib of ['twing', 'twig'] as const) {
  describe(`createWrapperEnv (${lib})`, () => {
    test('simple {{ _story }} wrapper wraps the rendered component', () => {
      const env = createWrapperEnv(lib, {
        templates: { '@t/badge/badge.twig': '<span>{{ label }}</span>' },
        namespaces: { t: ['/x'] },
      })
      expect(
        env.render(
          't:badge',
          {},
          { label: 'Hi' },
          '<div class="card">{{ _story }}</div>'
        )
      ).toBe('<div class="card"><span>Hi</span></div>')
    })

    test('include-based wrapper resolves the namespaced component', () => {
      const env = createWrapperEnv(lib, {
        templates: { '@t/badge/badge.twig': '<span>{{ label }}</span>' },
        namespaces: { t: ['/x'] },
      })
      expect(
        env.render(
          't:badge',
          {},
          {},
          "{% for c in ['a','b'] %}{% include 't:badge' with {label: c} %}{% endfor %}"
        )
      ).toBe('<span>a</span><span>b</span>')
    })
  })
}

// `_story|merge` showcases use nested `{...}` literals inside `{{ }}` — a Twing
// idiom Twig.js can't parse, so UIP Twig.js themes don't use it.
describe('createWrapperEnv (twing) — _story|merge showcase', () => {
  test('renders the merged variations in Node', () => {
    const env = createWrapperEnv('twing', {
      templates: { '@t/badge/badge.twig': BADGE },
      namespaces: { t: ['/x'] },
    })
    const wrapper =
      "{% for c in ['primary','secondary'] %}" +
      '{{ _story' +
      "|merge({'#props': {attributes: create_attribute({class: ['text-bg-' ~ c]})}})" +
      "|merge({'#slots': {label: c|capitalize}}) }}" +
      '{% endfor %}'
    expect(env.render('t:badge', {}, {}, wrapper)).toBe(
      '<span class="text-bg-primary badge">Primary</span>' +
        '<span class="text-bg-secondary badge">Secondary</span>'
    )
  })
})
