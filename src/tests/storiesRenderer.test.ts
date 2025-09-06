import { describe, it, expect, test } from 'vitest'
import { storyNodeRenderer } from '../storyNodeRender.ts'
describe('storiesRenderer', () => {
  test.each([
    [
      { type: 'component', component: 'umami:card' },
      'umamicard.default.component({...umamicard.Basic.args, ...{}, ...{ }, ...{}})',
    ],
    [
      { type: 'component', component: 'umami:card', story: 'preview' },
      'umamicard.default.component({...umamicard.Basic.args, ...umamicard.Preview.args, ...{ }, ...{}})',
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
      'umamicard.default.component({...umamicard.Basic.args, ...umamicard.Preview.args, ...{ }, ...{content: new TwigSafeArray(umamititle.default.component({...umamititle.Basic.args, ...{}, ...{ }, ...{}})),}})',
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
