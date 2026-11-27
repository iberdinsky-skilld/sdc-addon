import { describe, expect, test } from 'vitest'
import twing from 'twing'
import Twig from 'twig'
import { addDrupalExtensions as addTwing } from '@christianwiedemann/drupal-twig-extensions/twing'
import { addDrupalExtensions as addTwig } from 'drupal-twig-extensions/twig'
import { createTwingRuntime } from '../renderer/twing.ts'
import { createTwigRuntime, type TwigJs } from '../renderer/twig.ts'
import { makeIconPack } from './helpers.ts'

const { createSynchronousEnvironment, createSynchronousArrayLoader } = twing

const BADGE =
  "{% set attributes = attributes.addClass('badge') %}" +
  '<span{{ attributes }}>{{ label }}</span>'

// The UI Patterns "advanced" wrapper: loop, merge #props/#slots, re-render.
const SHOWCASE = `{% for c in ['primary', 'success'] %}{{ _story|merge({
  '#props': _story['#props']|merge({ attributes: create_attribute({ class: ['text-bg-' ~ c] }) }),
  '#slots': _story['#slots']|merge({ label: c|capitalize })
}) }}{% endfor %}`

const SHOWCASE_HTML =
  '<span class="text-bg-primary badge">Primary</span>' +
  '<span class="text-bg-success badge">Success</span>'

function twingRuntime() {
  const env = createSynchronousEnvironment(
    createSynchronousArrayLoader({ 't:badge': BADGE })
  )
  addTwing(env)
  const core = createTwingRuntime({
    heart: makeIconPack({ template: '<i>{{ icon_id }}</i>' }),
  })
  core.registerSdcRuntime(env)
  return core
}

const twigJs = Twig as unknown as TwigJs
addTwig(twigJs)
const twigCore = createTwigRuntime({
  heart: makeIconPack({ template: '<i>{{ icon_id }}</i>' }),
})
twigCore.registerSdcRuntime(twigJs)
twigCore.registerComponent('t:badge', (context) =>
  twigJs.twig({ data: BADGE }).render(context)
)

const engines = [
  ['twing', twingRuntime()],
  ['twig', twigCore],
] as const

describe.each(engines)('library_wrapper on %s', (_engine, rt) => {
  test('{{ _story }} prints the component inside the wrapper', () => {
    expect(
      rt.renderWrapper(
        '<div class="card">{{ _story }}</div>',
        't:badge',
        { label: 'Hi' },
        ['label']
      )
    ).toBe('<div class="card"><span class="badge">Hi</span></div>')
  })

  test('args split into #props and #slots; Storybook-only args are left out', () => {
    expect(
      rt.renderWrapper(
        "{{ _story['#props']|keys|join(',') }}|{{ _story['#slots']|keys|join(',') }}",
        't:badge',
        {
          variant: 'a',
          label: 'b',
          componentMetadata: {},
          defaultAttributes: [],
        },
        ['label']
      )
    ).toBe('variant|label')
  })

  test('_story|merge renders each variation', () => {
    expect(
      rt.renderWrapper(SHOWCASE, 't:badge', { label: 'x' }, ['label'])
    ).toBe(SHOWCASE_HTML)
  })

  test('icon() works in the wrapper', () => {
    expect(
      rt.renderWrapper("{{ icon('heart', 'love') }}", 't:badge', {}, [])
    ).toBe('<i>love</i>')
  })

  test('a broken wrapper renders empty', () => {
    expect(rt.renderWrapper('{{ _story', 't:badge', {}, [])).toBe('')
  })
})

test('twing: the wrapper can include a component by id', () => {
  expect(
    twingRuntime().renderWrapper(
      "{% for c in ['a','b'] %}{% include 't:badge' with {label: c} %}{% endfor %}",
      't:badge',
      {},
      []
    )
    // A bare include gets no attributes here; the SDC loader adds them in Storybook.
  ).toBe('<span>a</span><span>b</span>')
})
