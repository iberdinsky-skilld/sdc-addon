import { describe, expect, test } from 'vitest'
import twing from 'twing'
// @ts-ignore — @christianwiedemann/drupal-twig-extensions ships no types
import { addDrupalExtensions } from '@christianwiedemann/drupal-twig-extensions/twing'
import {
  createNodeResolver,
  PrintableArray,
  nodeGet,
  registerCustomNodes,
} from '../renderer/nodes.ts'
import { createTwingWrapperRuntime } from '../renderer/twingWrapper.ts'

const resolver = createNodeResolver({
  renderComponent: (node) => `<comp:${String(nodeGet(node, 'component'))}>`,
  renderIcon: (p, i) => `<icon:${p}:${i}>`,
})
const html = (v: unknown) => String(resolver.resolve(v))

describe('createNodeResolver', () => {
  test('html_tag → element with DrupalAttribute serialization', () => {
    expect(
      html({
        type: 'html_tag',
        tag: 'a',
        attributes: { href: '#' },
        value: 'x',
      })
    ).toBe('<a href="#">x</a>')
    expect(
      html({
        type: 'html_tag',
        tag: 'span',
        attributes: { class: ['mb-0', 'h1'] },
        value: 'h',
      })
    ).toBe('<span class="mb-0 h1">h</span>')
  })

  test('bare {markup} and element', () => {
    expect(html({ markup: 'hi' })).toBe('hi')
    expect(html({ type: 'element', tag: 'span', value: 'y' })).toBe(
      '<span>y</span>'
    )
  })

  test('component / icon delegate to injected renderers', () => {
    expect(html({ type: 'component', component: 'ns:child', slots: {} })).toBe(
      '<comp:ns:child>'
    )
    expect(html({ type: 'icon', pack_id: 'p', icon_id: 'i' })).toBe(
      '<icon:p:i>'
    )
  })

  test('custom node returning a string renders at runtime', () => {
    registerCustomNodes([
      {
        match: (item) => nodeGet(item, 'type') === 'youtube',
        render: (item) =>
          `<iframe src="https://www.youtube.com/embed/${String(
            nodeGet(item, 'id')
          )}"></iframe>`,
      },
    ])
    try {
      expect(html({ type: 'youtube', id: 'abc' })).toBe(
        '<iframe src="https://www.youtube.com/embed/abc"></iframe>'
      )
    } finally {
      registerCustomNodes([])
    }
  })

  test('custom node returning a node resolves through the pipeline', () => {
    registerCustomNodes([
      {
        match: (item) => nodeGet(item, 'type') === 'link',
        render: (item) => ({
          type: 'element',
          tag: 'a',
          attributes: { href: nodeGet(item, 'url') },
          value: nodeGet(item, 'value'),
        }),
      },
    ])
    try {
      expect(
        html({
          type: 'link',
          url: '#',
          value: ['hi ', { type: 'icon', pack_id: 'p', icon_id: 'i' }],
        })
      ).toBe('<a href="#">hi <icon:p:i></a>')
    } finally {
      registerCustomNodes([])
    }
  })

  test('array → PrintableArray that prints joined and recurses (nested)', () => {
    expect(
      html([{ markup: 'a' }, { type: 'html_tag', tag: 'b', value: 'c' }])
    ).toBe('a<b>c</b>')
    expect(html([[{ markup: 'x' }], { markup: 'y' }])).toBe('xy')
    expect(resolver.resolve([{ markup: 'a' }])).toBeInstanceOf(PrintableArray)
  })

  test('scalars and plain data objects pass through unchanged', () => {
    expect(resolver.resolve('plain')).toBe('plain')
    expect(resolver.resolve(5)).toBe(5)
    // back-compat: a data object (no node shape) is NOT rendered
    const data = { title: 'A', url: '/' }
    expect(resolver.resolve(data)).toBe(data)
  })

  test('PrintableArray stays iterable with its resolved items', () => {
    const pa = resolver.resolve([{ markup: 'a' }, { markup: 'b' }])
    expect([...(pa as PrintableArray)]).toEqual(['a', 'b'])
  })
})

// ── e2e through the real runtime ─────────────────────────────────────────────
const { createSynchronousEnvironment, createSynchronousArrayLoader } =
  twing as unknown as {
    createSynchronousEnvironment: (loader: unknown) => {
      render: (name: string, ctx: unknown) => string
    }
    createSynchronousArrayLoader: (t: Record<string, string>) => unknown
  }

function makeRuntime(templates: Record<string, string>) {
  const env = createSynchronousEnvironment(
    createSynchronousArrayLoader(templates)
  )
  addDrupalExtensions(env as never)
  const rt = createTwingWrapperRuntime({})
  rt.registerSdcRuntime(env as never)
  return rt
}

describe('_story node rendering (twing e2e)', () => {
  test('array of component nodes renders — no "Array"', () => {
    const rt = makeRuntime({
      table: '<table>{{ rows }}</table>',
      row: '<tr>{{ label }}</tr>',
    })
    const story = rt.makeStory(
      'table',
      {},
      {
        rows: [
          { type: 'component', component: 'row', slots: { label: 'A' } },
          { type: 'component', component: 'row', slots: { label: 'B' } },
        ],
      },
      { context: {} }
    )
    expect(String(story)).toBe('<table><tr>A</tr><tr>B</tr></table>')
  })

  test('single html_tag node in a slot (regression for [object Object])', () => {
    const rt = makeRuntime({ x: '{{ brand }}' })
    const story = rt.makeStory(
      'x',
      {},
      {
        brand: {
          type: 'html_tag',
          tag: 'a',
          attributes: { href: '#' },
          value: 'As a link',
        },
      },
      { context: {} }
    )
    expect(String(story)).toBe('<a href="#">As a link</a>')
  })

  test('a component iterating a data slot keeps item fields (dropdown back-compat)', () => {
    const rt = makeRuntime({
      dd: '<ul>{% for i in content %}<li>{{ i.title }}</li>{% endfor %}</ul>',
    })
    const story = rt.makeStory(
      'dd',
      {},
      { content: [{ title: 'A' }, { title: 'B' }] },
      { context: {} }
    )
    expect(String(story)).toBe('<ul><li>A</li><li>B</li></ul>')
  })

  test('scalar slot value is unchanged', () => {
    const rt = makeRuntime({ s: '{{ label }}' })
    const story = rt.makeStory('s', {}, { label: 'plain' }, { context: {} })
    expect(String(story)).toBe('plain')
  })
})

// Printing a list renders its items (Drupal parity), not the literal "Array".
const { createSynchronousTest } = twing as unknown as {
  createSynchronousTest: (
    name: string,
    fn: (c: unknown, v: unknown) => boolean,
    args: unknown[]
  ) => unknown
}

// the theme's exact isSequence (ui_suite_bootstrap / daisyui twing-hooks)
function isSequence(value: unknown): boolean {
  if (value == null) return false
  if (Array.isArray(value)) return true
  if (value instanceof Map) return false
  if (typeof value === 'object') {
    if (
      typeof (value as Record<symbol, unknown>)[Symbol.iterator] === 'function'
    )
      return true
    const keys = Object.keys(value)
    return keys.length > 0 && keys.every((k, i) => String(i) === k)
  }
  return false
}

function seqRuntime(templates: Record<string, string>) {
  const env = createSynchronousEnvironment(
    createSynchronousArrayLoader(templates)
  )
  addDrupalExtensions(env as never)
  ;(env as unknown as { addTest: (t: unknown) => void }).addTest(
    createSynchronousTest('sequence', (_c, v) => isSequence(v), [])
  )
  const rt = createTwingWrapperRuntime({})
  rt.registerSdcRuntime(env as never)
  return rt
}

describe('printing a list renders items, not "Array" (twing)', () => {
  test('{{ slot }} of nodes prints joined (grid-row-1 idiom)', () => {
    const rt = seqRuntime({
      g: '{% set c = c is not sequence ? [c] : c %}{{ c }}',
    })
    const story = rt.makeStory(
      'g',
      {},
      { c: [{ markup: '<x>1</x>' }, { markup: '<y>2</y>' }] },
      { context: {} }
    )
    expect(String(story)).toBe('<x>1</x><y>2</y>')
  })

  test('{% for r in [a, b] %}{{ r }}{% endfor %} (grid-row-2 idiom)', () => {
    const rt = seqRuntime({
      g: '{% for r in regions %}{{ r }}{% endfor %}',
    })
    const story = rt.makeStory(
      'g',
      {},
      {
        regions: [[{ markup: 'A' }], [{ markup: 'B' }]],
      },
      { context: {} }
    )
    expect(String(story)).toBe('AB')
  })

  test('single slot value survives `is not sequence ? [X] : X` (offset-class idiom)', () => {
    const rt = seqRuntime({
      g: '{% set c = c and c is not sequence ? [c] : c %}{{ c }}',
    })
    const story = rt.makeStory(
      'g',
      {},
      { c: '.col-md-6 .offset-md-3' },
      { context: {} }
    )
    expect(String(story)).toBe('.col-md-6 .offset-md-3')
  })

  test('nested list item renders (list--unstyled idiom)', () => {
    const rt = seqRuntime({
      l: '<ul>{% for item in items %}<li>{{ item }}</li>{% endfor %}</ul>',
    })
    const story = rt.makeStory(
      'l',
      {},
      { items: [[{ markup: 'n1' }], { markup: 'n2' }] },
      { context: {} }
    )
    expect(String(story)).toBe('<ul><li>n1</li><li>n2</li></ul>')
  })
})
