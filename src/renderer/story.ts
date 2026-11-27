// library_wrapper stories: the wrapper template gets `_story`, a UI Patterns
// render array { '#component', '#props', '#slots' } that prints the component.
import { toAttribute } from './attributes.ts'
import { entries, toPlainObject, toText } from './collections.ts'
import { twigArgs } from './nodes.ts'

// A render array that prints itself.
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

// #props and #slots as one context, `attributes` as a DrupalAttribute.
export function storyContext(
  story: Record<string, unknown>
): Record<string, unknown> {
  const slots = toPlainObject(story['#slots']) ?? {}
  const ctx = twigArgs(
    { ...toPlainObject(story['#props']), ...slots },
    Object.keys(slots)
  )
  ctx['attributes'] = toAttribute(ctx['attributes'])
  return ctx
}

// What the engine does for the wrapper: render a component by id, render a
// template string.
export interface WrapperEngine {
  renderComponent(id: string, context: Record<string, unknown>): unknown
  renderTemplate(template: string, context: Record<string, unknown>): string
}

export function createWrapperRenderer(engine: WrapperEngine) {
  function makeStory(data: Record<string, unknown>): Story {
    const story: Story = {
      ...data,
      toString: () => {
        const id = toText(story['#component'])
        try {
          return toText(engine.renderComponent(id, storyContext(story)))
        } catch (e) {
          console.error('[SDC] render story "' + id + '" error:', e)
          return ''
        }
      },
    }
    // Non-enumerable, so Twig loops and merges skip it.
    Object.defineProperty(story, 'toString', { enumerable: false })
    Object.defineProperty(story, '__sdcStory', {
      value: true,
      enumerable: false,
    })
    return story
  }

  // New printable render array (b wins); the native merge returns a plain Map.
  function mergeStory(a: unknown, b: unknown): Story {
    return makeStory(
      Object.fromEntries(
        [...entries(a), ...entries(b)].map(([k, v]) => [toText(k), v])
      )
    )
  }

  function renderWrapper(
    wrapper: string,
    componentId: string,
    args: Record<string, unknown>,
    slotNames: readonly string[]
  ): string {
    const props: Record<string, unknown> = {}
    const slots: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(twigArgs(args, slotNames))) {
      if (key === 'componentMetadata' || key === 'defaultAttributes') continue
      ;(slotNames.includes(key) ? slots : props)[key] = value
    }
    const _story = makeStory({
      '#component': componentId,
      '#props': props,
      '#slots': slots,
    })
    try {
      return engine.renderTemplate(wrapper, { _story })
    } catch (e) {
      console.error('[SDC] library_wrapper error:', e)
      return ''
    }
  }

  return { renderWrapper, mergeStory }
}
