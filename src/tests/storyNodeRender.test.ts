import { afterEach, describe, expect, test } from 'vitest'
import { renderStoryNode, generateArgs } from '../generate/nodeCodegen.ts'
import { registerCustomNodes } from '../renderer/nodes.ts'

afterEach(() => registerCustomNodes([]))

describe('generateArgs slot wrapping', () => {
  test('single slot value is wrapped so `is not sequence ? [X] : X` stays printable', () => {
    expect(
      generateArgs({ col_1_content: '.col-md-6 .offset-md-3' }, true)
    ).toBe('col_1_content: new TwigSafeArray(".col-md-6 .offset-md-3"),')
  })
  test('single PROP value is NOT wrapped', () => {
    expect(generateArgs({ title: 'Hi' }, false)).toBe('title: "Hi",')
  })
  test('nested array slot wraps the inner array too', () => {
    expect(generateArgs({ items: [['a'], 'b'] }, true)).toContain(
      'new TwigSafeArray(new TwigSafeArray("a"), "b")'
    )
  })
})

describe('html_tag node (build-time, aligned with runtime)', () => {
  test('renders as <tag attrs>value</tag>', () => {
    expect(
      renderStoryNode({
        type: 'html_tag',
        tag: 'a',
        attributes: { href: '#' },
        value: 'x',
      })
    ).toBe('("<a href=\\"#\\">" + "x" + "</a>")')
  })
  test('defaults to div and empty children', () => {
    expect(renderStoryNode({ type: 'html_tag' })).toBe(
      '("<div>" + "" + "</div>")'
    )
  })
  test('renders a child under a non-standard key (Drupal parity)', () => {
    expect(
      renderStoryNode({
        type: 'html_tag',
        tag: 'a',
        attributes: { href: '#' },
        icon: { type: 'icon', pack_id: 'p', icon_id: 'i' },
      })
    ).toBe('("<a href=\\"#\\">" + _sdcRenderIcon("p", "i", {}) + "</a>")')
  })
  test('renders value first, then extra-key children in order', () => {
    expect(
      renderStoryNode({
        type: 'html_tag',
        tag: 'div',
        value: 'X',
        extra: { markup: 'Y' },
      })
    ).toBe('("<div>" + "X" + "Y" + "</div>")')
  })
})

describe('renderStoryNode (build codegen)', () => {
  test('renders component with primitive props', () => {
    const item = {
      type: 'component',
      component: 'umami:card',
      props: { title: 'Hello' },
    }
    const out = renderStoryNode(item)
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

    const out = renderStoryNode(item)
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

    const out = renderStoryNode(item)
    expect(out).toContain('new TwigSafeArray')
    expect(out).toContain('"a"')
    expect(out).toContain('"b"')
  })

  test('unknown object falls back to JSON string', () => {
    const obj = { foo: 'bar' }
    expect(renderStoryNode(obj)).toBe(JSON.stringify(obj))
  })

  test('mixed array slot of primitives and components', () => {
    const item = {
      type: 'component',
      component: 'umami:container',
      slots: {
        content: ['x', { type: 'component', component: 'umami:title' }],
      },
    }

    const out = renderStoryNode(item)
    expect(out).toContain('new TwigSafeArray(')
    expect(out).toContain('"x"')
    expect(out).toContain('umamititle.default.component(')
  })

  test('component with no props or slots produces empty args sections', () => {
    const item = { type: 'component', component: 'umami:card' }
    const out = renderStoryNode(item)
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
      '"<img src=\\"https://placehold.co/600x400\\" />"',
    ],
    [
      {
        type: 'image',
        uri: 'https://placehold.co/600x400',
        attributes: { class: ['class-1', 'class-2'] },
      },
      '"<img class=\\"class-1 class-2\\" src=\\"https://placehold.co/600x400\\" />"',
    ],
    [{ type: 'element', value: 'sample' }, '("<div>" + "sample" + "</div>")'],
    [
      {
        type: 'element',
        value: 'sample',
        tag: 'span',
        attributes: { class: 'class-1' },
      },
      '("<span class=\\"class-1\\">" + "sample" + "</span>")',
    ],
    [
      { type: 'markup', markup: '<div> sample </div>' },
      '"<div> sample </div>"',
    ],
    ['sample string', '"sample string"'],
    [1, '1'],
  ])('Render(%s) -> expected: %s', (storyArray, expected: string) => {
    expect(renderStoryNode(storyArray)).toBe(expected)
  })

  test('theme:image maps uri/width/height/alt onto the <img> like Drupal', () => {
    const out = renderStoryNode({
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
    const out = renderStoryNode({
      theme: 'image',
      uri: 'x',
      alt: 'A',
      attributes: { alt: 'B' },
    })
    expect(out).toBe('"<img alt=\\"A\\" src=\\"x\\" />"')
  })

  test('theme:image defaults alt to "" and joins srcset', () => {
    const out = renderStoryNode({
      theme: 'image',
      uri: 'x',
      srcset: [
        { uri: 'a.webp', width: '600w' },
        { uri: 'b.webp', width: '1200w' },
      ],
    })
    expect(out).toBe(
      '"<img src=\\"x\\" srcset=\\"a.webp 600w, b.webp 1200w\\" />"'
    )
  })

  test('custom node returning a string is emitted as a literal', () => {
    registerCustomNodes([
      {
        match: (item: any) => item?.type === 'youtube',
        render: (item: any) => `<iframe src="${item.id}"></iframe>`,
      },
    ])
    expect(renderStoryNode({ type: 'youtube', id: 'x' })).toBe(
      JSON.stringify('<iframe src="x"></iframe>')
    )
  })

  test('custom node returning a node is fed back through codegen', () => {
    registerCustomNodes([
      {
        match: (item: any) => item?.type === 'link',
        render: (item: any) => ({
          type: 'element',
          tag: 'a',
          attributes: { href: item.url },
          value: item.value,
        }),
      },
    ])
    const out = renderStoryNode({
      type: 'link',
      url: '#',
      value: ['hi ', { type: 'icon', pack_id: 'p', icon_id: 'i' }],
    })
    expect(out).toContain('"<a href=\\"#\\">"')
    expect(out).toContain(
      'new TwigSafeArray("hi ", _sdcRenderIcon("p", "i", {}))'
    )
  })

  test('renders a type:icon node via the Icon API helper', () => {
    const out = renderStoryNode({
      type: 'icon',
      pack_id: 'hero_outline_24',
      icon_id: 'heart',
      settings: { size: 48 },
    })
    expect(out).toBe('_sdcRenderIcon("hero_outline_24", "heart", {"size":48})')
  })

  test('type:icon node without settings defaults to {}', () => {
    const out = renderStoryNode({
      type: 'icon',
      pack_id: 'p',
      icon_id: 'i',
    })
    expect(out).toBe('_sdcRenderIcon("p", "i", {})')
  })

  test('a custom node matching a built-in type takes precedence', () => {
    registerCustomNodes([
      {
        match: (item: any) => item?.type === 'icon',
        render: () => '<custom-icon></custom-icon>',
      },
    ])
    const out = renderStoryNode({
      type: 'icon',
      pack_id: 'p',
      icon_id: 'i',
    })
    expect(out).toBe(JSON.stringify('<custom-icon></custom-icon>'))
  })
})
