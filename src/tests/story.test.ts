import { describe, expect, test, vi } from 'vitest'
import {
  createWrapperRenderer,
  isStory,
  storyContext,
} from '../renderer/story.ts'

const engine = () => ({
  renderComponent: vi.fn(
    (_id: string, _context: Record<string, unknown>) => '<rendered>'
  ),
  renderTemplate: vi.fn((_template: string, context: Record<string, unknown>) =>
    String(context['_story'])
  ),
})

describe('createWrapperRenderer', () => {
  test('_story is a render array that prints the component', () => {
    const e = engine()
    const { renderWrapper } = createWrapperRenderer(e)
    expect(
      renderWrapper('{{ _story }}', 'ns:badge', { label: 'Hi' }, ['label'])
    ).toBe('<rendered>')
    const story: unknown = e.renderTemplate.mock.calls[0]?.[1]['_story']
    expect(isStory(story)).toBe(true)
    // markers are non-enumerable (don't leak into Twig map ops)
    expect(Object.keys(story ?? {})).toEqual(['#component', '#props', '#slots'])
    const [id, context] = e.renderComponent.mock.calls[0] ?? []
    expect(id).toBe('ns:badge')
    expect(String(context?.['label'])).toBe('Hi')
  })

  test('mergeStory shallow-merges with b winning and stays printable', () => {
    const e = engine()
    const { mergeStory } = createWrapperRenderer(e)
    const merged = mergeStory(
      {
        '#component': 'ns:badge',
        '#props': { a: 1 },
        '#slots': { label: 'L' },
      },
      { '#props': { c: 9 } }
    )
    expect(merged['#component']).toBe('ns:badge')
    expect(merged['#props']).toEqual({ c: 9 })
    expect(merged['#slots']).toEqual({ label: 'L' })
    expect(isStory(merged)).toBe(true)
    expect(String(merged)).toBe('<rendered>')
  })

  test('a component that throws prints empty', () => {
    const { mergeStory } = createWrapperRenderer({
      renderComponent: () => {
        throw new Error('boom')
      },
      renderTemplate: () => '',
    })
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(String(mergeStory({ '#component': 'x' }, {}))).toBe('')
    error.mockRestore()
  })
})

test('isStory detects plain objects, Maps and render arrays; rejects others', () => {
  expect(isStory({ '#component': 'x' })).toBe(true)
  expect(isStory(new Map([['#component', 'x']]))).toBe(true)
  expect(isStory({ foo: 1 })).toBe(false)
  expect(isStory(new Map([['foo', 1]]))).toBe(false)
  expect(isStory(null)).toBe(false)
  expect(isStory('x')).toBe(false)
})

test('storyContext spreads #props and #slots (slots win, slot printable)', () => {
  const ctx = storyContext({ '#props': { a: 1, x: 'p' }, '#slots': { x: 's' } })
  expect(ctx['a']).toBe(1)
  expect(String(ctx['x'])).toBe('s')
  expect(String(ctx['attributes'])).toBe('')
})
