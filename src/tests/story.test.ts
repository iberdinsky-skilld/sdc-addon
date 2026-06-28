import { describe, expect, test, vi } from 'vitest'
import { isStory, storyContext, createStoryFactory } from '../renderer/story.ts'

describe('createStoryFactory', () => {
  test('makeStory builds a render array with #component/#props/#slots', () => {
    const { makeStory } = createStoryFactory(() => '')
    const s = makeStory(
      'ns:badge',
      { color: 'primary' },
      { label: 'Hi' },
      undefined
    )
    expect(s['#component']).toBe('ns:badge')
    expect(s['#props']).toEqual({ color: 'primary' })
    expect(s['#slots']).toEqual({ label: 'Hi' })
    // markers are non-enumerable (don't leak into Twig map ops)
    expect(Object.keys(s)).toEqual(['#component', '#props', '#slots'])
    expect(isStory(s)).toBe(true)
  })

  test('toString renders #component through the host renderStory with its base', () => {
    const renderStory = vi.fn(() => '<rendered>')
    const { makeStory } = createStoryFactory(renderStory)
    const base = { context: { componentMetadata: { path: '/x' } } }
    const s = makeStory('ns:badge', {}, { label: 'Hi' }, base)
    expect(String(s)).toBe('<rendered>')
    expect(renderStory).toHaveBeenCalledWith(s, base)
  })

  test('mergeStory shallow-merges with b winning, stays printable, carries base', () => {
    const renderStory = vi.fn(() => 'R')
    const { makeStory, mergeStory } = createStoryFactory(renderStory)
    const base = { context: { defaultAttributes: [] as unknown[] } }
    const story = makeStory('ns:badge', { a: 1, c: 1 }, { label: 'L' }, base)

    const merged = mergeStory(story, { '#props': { c: 9 } })
    // b overrides a on shared keys; #component/#slots carried from a
    expect(merged['#component']).toBe('ns:badge')
    expect(merged['#props']).toEqual({ c: 9 })
    expect(merged['#slots']).toEqual({ label: 'L' })
    expect(isStory(merged)).toBe(true)
    expect(Object.keys(merged)).toEqual(['#component', '#props', '#slots'])

    // still printable, and base propagates from the story operand
    expect(String(merged)).toBe('R')
    expect(renderStory).toHaveBeenLastCalledWith(merged, base)
  })

  test('isStory detects plain objects, Maps and render arrays; rejects others', () => {
    expect(isStory({ '#component': 'x' })).toBe(true)
    expect(isStory(new Map([['#component', 'x']]))).toBe(true)
    expect(isStory({ foo: 1 })).toBe(false)
    expect(isStory(new Map([['foo', 1]]))).toBe(false)
    expect(isStory(null)).toBe(false)
    expect(isStory('x')).toBe(false)
  })

  test('storyContext spreads base context + #props + #slots (slots win, slot wrapped)', () => {
    const ctx = storyContext(
      { '#props': { a: 1, x: 'p' }, '#slots': { x: 's' } },
      { context: { componentMetadata: { path: '/p' } } }
    )
    expect(ctx.componentMetadata).toEqual({ path: '/p' })
    expect(ctx.a).toBe(1)
    // slot wins over prop; a single slot value is wrapped into a printable list
    expect(String(ctx.x)).toBe('s')
  })
})
