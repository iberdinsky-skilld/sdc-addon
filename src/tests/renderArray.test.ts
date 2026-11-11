import { describe, expect, test } from 'vitest'
import twing from 'twing'
import TwigJs from 'twig'
import { addDrupalExtensions as addTwing } from '@christianwiedemann/drupal-twig-extensions/twing'
import { addDrupalExtensions as addTwig } from 'drupal-twig-extensions/twig'
import { toAttribute } from '../renderer/attributes.ts'
import { toText } from '../renderer/collections.ts'
import { createTwingWrapperRuntime } from '../renderer/twingWrapper.ts'
import { createTwigWrapperRuntime } from '../renderer/twigWrapper.ts'
import { makeIconPack } from './helpers.ts'

const { createSynchronousEnvironment, createSynchronousArrayLoader } = twing

// The UI Patterns "advanced" wrapper: loop, merge #props/#slots, re-render.
const WRAPPER = `{% for c in ['primary', 'success'] %}{{ _story|merge({
  '#props': _story['#props']|merge({ attributes: create_attribute({ class: ['text-bg-' ~ c] }) }),
  '#slots': _story['#slots']|merge({ label: c|capitalize })
}) }}{% endfor %}`

const BADGE_TWIG =
  "{% set attributes = attributes.addClass('badge') %}<span{{ attributes }}>{{ label }}</span>"

describe('advanced render-array pattern (end-to-end through the real runtime)', () => {
  test('twing: merge override + renderStory render each variant', () => {
    const loader = createSynchronousArrayLoader({
      badge: BADGE_TWIG,
      wrap: WRAPPER,
    })
    const env = createSynchronousEnvironment(loader)
    addTwing(env)
    const rt = createTwingWrapperRuntime({})
    rt.registerSdcRuntime(env)

    const story = rt.makeStory('badge', {}, { label: 'base' }, { context: {} })

    // bare token renders the component with an empty Attribute
    expect(String(story)).toBe('<span class="badge">base</span>')

    // advanced loop: b wins on #props.attributes / #slots.label per iteration
    const out = env.render('wrap', { _story: story })
    expect(out).toContain('<span class="text-bg-primary badge">Primary</span>')
    expect(out).toContain('<span class="text-bg-success badge">Success</span>')
  })

  test('twig.js: merge override + base.render render each variant', () => {
    addTwig(TwigJs)
    const rt = createTwigWrapperRuntime({})
    rt.registerSdcRuntime(TwigJs)

    // twig.js renders through the component's own render(); mimic SDC's.
    const render = (ctx: Record<string, unknown>): string => {
      const attrs = toAttribute(ctx['attributes'])
      attrs.addClass('badge')
      return `<span${attrs.toString()}>${toText(ctx['label'])}</span>`
    }
    const story = rt.makeStory(
      'badge',
      {},
      { label: 'base' },
      { context: {}, render }
    )

    expect(String(story)).toBe('<span class="badge">base</span>')

    const out = TwigJs.twig({ data: WRAPPER }).render({ _story: story })
    expect(out).toContain('text-bg-primary badge')
    expect(out).toContain('Primary')
    expect(out).toContain('text-bg-success badge')
    expect(out).toContain('Success')
  })

  test('twing: renderInline renders a template string (and no-ops before register)', () => {
    const rt = createTwingWrapperRuntime({})
    // before registerSdcRuntime the env is unavailable → returns the input
    expect(rt.renderInline("{{ 'a' ~ 'b' }}", {})).toBe("{{ 'a' ~ 'b' }}")
    expect(rt.renderInline('', {})).toBe('')

    const env = createSynchronousEnvironment(createSynchronousArrayLoader({}))
    addTwing(env)
    rt.registerSdcRuntime(env)
    expect(rt.renderInline("{{ 'a' ~ 'b' }}", {})).toBe('ab')
    expect(rt.renderInline('{{ x }}', { x: 'hi' })).toBe('hi')
  })

  test('twing: renderIcon renders the pack template with the icon context', () => {
    const pack = makeIconPack({ template: '<i>{{ icon_id }}</i>' })
    const rt = createTwingWrapperRuntime({ heart: pack })
    // before register → ''
    expect(rt.renderIcon('heart', 'love', {})).toBe('')

    const env = createSynchronousEnvironment(createSynchronousArrayLoader({}))
    addTwing(env)
    rt.registerSdcRuntime(env)
    expect(rt.renderIcon('heart', 'love', {})).toBe('<i>love</i>')
    // unknown pack / missing id → ''
    expect(rt.renderIcon('nope', 'love', {})).toBe('')
    expect(rt.renderIcon('heart', '', {})).toBe('')
  })

  test('twig.js: renderInline renders a template string (no-op before register)', () => {
    const rt = createTwigWrapperRuntime({})
    expect(rt.renderInline("{{ 'a' ~ 'b' }}", {})).toBe("{{ 'a' ~ 'b' }}")
    rt.registerSdcRuntime(TwigJs)
    expect(rt.renderInline("{{ 'a' ~ 'b' }}", {})).toBe('ab')
    expect(rt.renderInline('{{ x }}', { x: 'hi' })).toBe('hi')
  })

  test('twig.js: renderIcon renders the pack template with the icon context', () => {
    const pack = makeIconPack({ template: '<i>{{ icon_id }}</i>' })
    const rt = createTwigWrapperRuntime({ heart: pack })
    expect(rt.renderIcon('heart', 'love', {})).toBe('')
    rt.registerSdcRuntime(TwigJs)
    expect(rt.renderIcon('heart', 'love', {})).toBe('<i>love</i>')
    expect(rt.renderIcon('nope', 'love', {})).toBe('')
    expect(rt.renderIcon('heart', '', {})).toBe('')
  })
})
