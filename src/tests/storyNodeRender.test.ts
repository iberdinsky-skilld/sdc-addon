import { describe, expect, test } from 'vitest'
import { storyNodeRenderer } from '../storyNodeRender.ts'

describe('storyNodeRenderer (merged)', () => {
  test('renders component with primitive props', () => {
    const item = {
      type: 'component',
      component: 'umami:card',
      props: { title: 'Hello' },
    }
    const out = storyNodeRenderer.render(item)
    expect(out).toContain('umamicard.default.component(')
    expect(out).toContain('title: "Hello"')
  })

  test('renders array slot with multiple components as TwigSafeArray', () => {
    const item = {
      type: 'component',
      component: 'umami:card',
      slots: {
        content: [
          { type: 'component', component: 'umami:title' },
          { type: 'component', component: 'umami:subtitle' },
        ],
      },
    }

    const out = storyNodeRenderer.render(item)
    expect(out).toContain('new TwigSafeArray(')
    expect(out).toContain('umamititle.default.component(')
    expect(out).toContain('umamisubtitle.default.component(')
    expect(out).toContain('content:')
  })

  test('renders array slot of primitives as TwigSafeArray of strings', () => {
    const item = {
      type: 'component',
      component: 'umami:list',
      slots: { items: ['a', 'b'] },
    }

    const out = storyNodeRenderer.render(item)
    expect(out).toContain('new TwigSafeArray')
    expect(out).toContain('"a"')
    expect(out).toContain('"b"')
  })

  test('unknown object falls back to JSON string', () => {
    const obj = { foo: 'bar' }
    expect(storyNodeRenderer.render(obj)).toBe(JSON.stringify(obj))
  })

  test('mixed array slot of primitives and components', () => {
    const item = {
      type: 'component',
      component: 'umami:container',
      slots: {
        content: ['x', { type: 'component', component: 'umami:title' }],
      },
    }

    const out = storyNodeRenderer.render(item)
    expect(out).toContain('new TwigSafeArray(')
    expect(out).toContain('"x"')
    expect(out).toContain('umamititle.default.component(')
  })

  test('component with no props or slots produces empty args sections', () => {
    const item = { type: 'component', component: 'umami:card' }
    const out = storyNodeRenderer.render(item)
    // should include base component invocation and empty story/props placeholders
    expect(out).toContain('umamicard.default.component(')
    expect(out).toContain('...{},')
  })

  // tests from storiesRenderer.test.ts
  test.each([
    [
      { type: 'component', component: 'umami:card' },
      'umamicard.default.component({...umamicard.Basic.baseArgs, ...{}, ...{ }, ...{}})',
    ],
    [
      { type: 'component', component: 'umami:card', story: 'preview' },
      'umamicard.default.component({...umamicard.Basic.baseArgs, ...umamicard.Preview.args, ...{ }, ...{}})',
    ],
    [
      {
        type: 'component',
        component: 'umami:card',
        story: 'preview',
        slots: {
          content: [
            {
              type: 'component',
              component: 'umami:title',
            },
          ],
        },
      },
      'umamicard.default.component({...umamicard.Basic.baseArgs, ...umamicard.Preview.args, ...{ }, ...{content: new TwigSafeArray(umamititle.default.component({...umamititle.Basic.baseArgs, ...{}, ...{ }, ...{}})),}})',
    ],

    [
      { type: 'image', uri: 'https://placehold.co/600x400' },
      '"<img src=\\"https://placehold.co/600x400\\" alt=\\"\\" />"',
    ],
    [
      {
        type: 'image',
        uri: 'https://placehold.co/600x400',
        attributes: { class: ['class-1', 'class-2'] },
      },
      '"<img class=\\"class-1 class-2\\" src=\\"https://placehold.co/600x400\\" alt=\\"\\" />"',
    ],
    [{ type: 'element', value: 'sample' }, '"<div> sample </div>"'],
    [
      {
        type: 'element',
        value: 'sample',
        tag: 'span',
        attributes: { class: 'class-1' },
      },
      '"<span class=\\"class-1\\"> sample </span>"',
    ],
    [
      { type: 'markup', markup: '<div> sample </div>' },
      '"<div> sample </div>"',
    ],
    ['sample string', '"sample string"'],
    [1, '1'],
  ])('Render(%s) -> expected: %s', (storyArray, expected: string) => {
    expect(storyNodeRenderer.render(storyArray)).toBe(expected)
  })

  test('theme:image maps uri/width/height/alt onto the <img> like Drupal', () => {
    const out = storyNodeRenderer.render({
      theme: 'image',
      uri: 'https://placehold.co/600x400',
      alt: 'Shoes',
      width: 600,
      height: 400,
    })
    expect(out).toBe(
      '"<img src=\\"https://placehold.co/600x400\\" width=\\"600\\" height=\\"400\\" alt=\\"Shoes\\" />"'
    )
  })

  test('theme:image alt variable overrides attributes.alt (Drupal behavior)', () => {
    const out = storyNodeRenderer.render({
      theme: 'image',
      uri: 'x',
      alt: 'A',
      attributes: { alt: 'B' },
    })
    expect(out).toBe('"<img alt=\\"A\\" src=\\"x\\" />"')
  })

  test('theme:image defaults alt to "" and joins srcset', () => {
    const out = storyNodeRenderer.render({
      theme: 'image',
      uri: 'x',
      srcset: [
        { uri: 'a.webp', width: '600w' },
        { uri: 'b.webp', width: '1200w' },
      ],
    })
    expect(out).toBe(
      '"<img src=\\"x\\" srcset=\\"a.webp 600w, b.webp 1200w\\" alt=\\"\\" />"'
    )
  })

  test('custom renderer receives renderValue to render nested values like a slot', () => {
    storyNodeRenderer.register([
      {
        appliesTo: (item) => item?.type === 'wrap_tag',
        render: (item, renderValue) =>
          `("<a>" + ${renderValue(item.value)} + "</a>")`,
        priority: 10,
      },
    ])

    // primitive value -> rendered as a quoted string
    expect(storyNodeRenderer.render({ type: 'wrap_tag', value: 'hi' })).toBe(
      '("<a>" + "hi" + "</a>")'
    )

    // array of nodes -> TwigSafeArray through the shared pipeline
    expect(
      storyNodeRenderer.render({
        type: 'wrap_tag',
        value: [{ type: 'icon', pack_id: 'p', icon_id: 'i' }],
      })
    ).toBe('("<a>" + new TwigSafeArray(_sdcRenderIcon("p", "i", {})) + "</a>")')
  })

  test('renders a type:icon node via the Icon API helper', () => {
    const out = storyNodeRenderer.render({
      type: 'icon',
      pack_id: 'hero_outline_24',
      icon_id: 'heart',
      settings: { size: 48 },
    })
    expect(out).toBe('_sdcRenderIcon("hero_outline_24", "heart", {"size":48})')
  })

  test('type:icon node without settings defaults to {}', () => {
    const out = storyNodeRenderer.render({
      type: 'icon',
      pack_id: 'p',
      icon_id: 'i',
    })
    expect(out).toBe('_sdcRenderIcon("p", "i", {})')
  })

  test('a user-provided icon renderer overrides the built-in one', () => {
    storyNodeRenderer.register([
      {
        appliesTo: (item) => item?.type === 'icon',
        render: () => '"CUSTOM"',
        priority: 10,
      },
    ])
    const out = storyNodeRenderer.render({
      type: 'icon',
      pack_id: 'p',
      icon_id: 'i',
    })
    expect(out).toBe('"CUSTOM"')
  })
})
