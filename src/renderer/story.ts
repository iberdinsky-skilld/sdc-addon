// UI Patterns render arrays for library_wrapper stories: `_story` is
// { '#component', '#props', '#slots' } and prints itself through `renderStory`.
import { entries, toText } from './collections.ts'
import { PrintableArray } from './nodes.ts'

// Per-story data that can't live in the Twig context: internal context and the
// component's own render().
export interface StoryBase {
  context?: Record<string, unknown>
  render?: (ctx: Record<string, unknown>) => string
}

// A render array that prints itself through the host's renderStory.
export interface Story extends Record<string, unknown> {
  toString(): string
}

export function isStory(value: unknown): boolean {
  if (value == null) return false
  if (typeof value === 'object' && '__sdcStory' in value && value.__sdcStory) {
    return true
  }
  if (value instanceof Map) return value.has('#component')
  if (typeof value === 'object') {
    return Object.prototype.hasOwnProperty.call(value, '#component')
  }
  return false
}

// Base context plus #props and #slots, each run through `resolveValue`.
export function storyContext(
  story: Record<string, unknown>,
  base: StoryBase | undefined,
  resolveValue: (value: unknown) => unknown = (v) => v
): Record<string, unknown> {
  const ctx: Record<string, unknown> = { ...base?.context }
  for (const [k, v] of entries(story['#props']))
    ctx[toText(k)] = resolveValue(v)
  for (const [k, v] of entries(story['#slots'])) {
    const r = resolveValue(v)
    ctx[toText(k)] =
      r != null && !(r instanceof PrintableArray) ? new PrintableArray(r) : r
  }
  return ctx
}

// Story factory bound to a host `renderStory`.
export function createStoryFactory(
  renderStory: (
    story: Record<string, unknown>,
    base: StoryBase | undefined
  ) => string
) {
  const storyBase = new WeakMap<object, StoryBase>()
  const baseOf = (value: unknown): StoryBase | undefined =>
    typeof value === 'object' && value !== null
      ? storyBase.get(value)
      : undefined

  function makeStoryObject(
    data: Record<string, unknown>,
    base: StoryBase | undefined
  ): Story {
    const obj: Story = {
      ...data,
      toString: () => renderStory(obj, storyBase.get(obj)),
    }
    // Non-enumerable, so Twig loops and merges skip it.
    Object.defineProperty(obj, 'toString', { enumerable: false })
    Object.defineProperty(obj, '__sdcStory', { value: true, enumerable: false })
    if (base) storyBase.set(obj, base)
    return obj
  }

  function makeStory(
    component: string,
    props: unknown,
    slots: unknown,
    base: StoryBase | undefined
  ): Story {
    return makeStoryObject(
      { '#component': component, '#props': props ?? {}, '#slots': slots ?? {} },
      base
    )
  }

  // New printable render array (b wins); the native merge returns a plain Map.
  function mergeStory(a: unknown, b: unknown): Story {
    const data = Object.fromEntries(
      [...entries(a), ...entries(b)].map(([k, v]) => [toText(k), v])
    )
    return makeStoryObject(data, baseOf(a) ?? baseOf(b))
  }

  return { makeStory, mergeStory }
}
