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
      '"<img src=\\"https://placehold.co/600x400\\">"',
    ],
    [
      {
        type: 'image',
        uri: 'https://placehold.co/600x400',
        attributes: { class: ['class-1', 'class-2'] },
      },
      '"<img src=\\"https://placehold.co/600x400\\" class=\\"class-1 class-2\\">"',
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
})
