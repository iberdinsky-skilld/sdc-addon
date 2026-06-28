// UI Patterns "render array" support for story library_wrappers. `_story` is a
// plain object ({ '#component', '#props', '#slots' }) with a non-enumerable
// toString() that renders #component through the host's `renderStory`.
import { entries, toPlain } from './collections.ts'

// Per-story data carried past the Twig context (a function can't be a Twig var):
// internal render context (componentMetadata, defaultAttributes) and the
// component's own render() (the twig.js path / env-absent fallback).
export interface StoryBase {
  context?: Record<string, unknown>
  render?: (ctx: Record<string, unknown>) => string
}

export function isStory(value: unknown): boolean {
  if (value == null) return false
  if (
    typeof value === 'object' &&
    (value as Record<string, unknown>)['__sdcStory']
  ) {
    return true
  }
  if (value instanceof Map) return value.has('#component')
  if (typeof value === 'object') {
    return Object.prototype.hasOwnProperty.call(value, '#component')
  }
  return false
}

// Render context for a render array: base internal keys + #props + #slots.
export function storyContext(
  story: Record<string, unknown>,
  base: StoryBase | undefined
): Record<string, unknown> {
  const props = (toPlain(story['#props']) as Record<string, unknown>) || {}
  const slots = (toPlain(story['#slots']) as Record<string, unknown>) || {}
  return Object.assign({}, base && base.context, props, slots)
}

// Story factory bound to a host `renderStory` (own WeakMap of bases per runtime).
export function createStoryFactory(
  renderStory: (
    story: Record<string, unknown>,
    base: StoryBase | undefined
  ) => string
) {
  const storyBase = new WeakMap<object, StoryBase>()

  function makeStoryObject(
    data: Record<string, unknown>,
    base: StoryBase | undefined
  ): Record<string, unknown> {
    const obj = { ...data }
    Object.defineProperty(obj, '__sdcStory', { value: true, enumerable: false })
    Object.defineProperty(obj, 'toString', {
      enumerable: false,
      value: () => renderStory(obj, storyBase.get(obj)),
    })
    if (base) storyBase.set(obj, base)
    return obj
  }

  function makeStory(
    component: string,
    props: unknown,
    slots: unknown,
    base: StoryBase | undefined
  ): Record<string, unknown> {
    return makeStoryObject(
      { '#component': component, '#props': props || {}, '#slots': slots || {} },
      base
    )
  }

  // Shallow-merge into a fresh printable render array (b wins) — keeps the
  // wrapper printable across `merge`, which natively returns a plain Map.
  function mergeStory(a: unknown, b: unknown): Record<string, unknown> {
    const data = Object.fromEntries([...entries(a), ...entries(b)])
    const base =
      storyBase.get(a as object) || storyBase.get(b as object) || undefined
    return makeStoryObject(data, base)
  }

  return { makeStory, mergeStory }
}
