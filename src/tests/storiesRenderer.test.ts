import { describe, it, expect, test } from 'vitest'
import { storyNodeRenderer } from '../storyNodeRender.ts'

describe('storiesRenderer', () => {
  test.each([
    ['sample string', '"sample string"'],
    [1, '1'],
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
    [{ type: 'html_tag', value: 'sample' }, '"<div> sample </div>"'],
    [
      {
        type: 'html_tag',
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
  ])('Render(%s) -> expected: %s', (storyArray, expected: string) => {
    expect(storyNodeRenderer.render(storyArray)).toBe(expected)
  })


})
