import type { CustomNode } from '../sdc.d.ts'
export class PrintableArray {
  declare readonly length: number;
  [index: number]: unknown
  constructor(...items: unknown[]) {
    for (let i = 0; i < items.length; i++) this[i] = items[i]
    // Non-enumerable: twig.js loops over Object.keys().
    Object.defineProperty(this, 'length', {
      value: items.length,
      enumerable: false,
      writable: false,
    })
  }
  [Symbol.iterator](): Iterator<unknown> {
    let i = 0
    return {
      next: () =>
        i < this.length
          ? { value: this[i++], done: false }
          : { value: undefined, done: true },
    }
  }
  toString(): string {
    return Array.prototype.join.call(this, '')
  }
}

const toPrintable = (items: unknown[]): PrintableArray =>
  new PrintableArray(
    ...items.map((item) => (Array.isArray(item) ? toPrintable(item) : item))
  )

// Slot values print their items; props stay plain data, as in Drupal.
export function twigArgs(
  args: Record<string, unknown>,
  slots: readonly string[]
): Record<string, unknown> {
  const out = { ...args }
  for (const key of slots) {
    const value = args[key]
    if (Array.isArray(value)) out[key] = toPrintable(value)
    else if (
      value != null &&
      value !== '' &&
      typeof value !== 'function' &&
      !(value instanceof PrintableArray)
    )
      out[key] = new PrintableArray(value)
  }
  return out
}

// Custom node registry for the story codegen.
let customNodes: CustomNode[] = []

export function registerCustomNodes(list: CustomNode[] | undefined): void {
  customNodes = list ?? []
}

function matchCustomNode(
  item: Record<string, unknown>
): CustomNode | undefined {
  return customNodes.find((c) => {
    try {
      return c.match(item)
    } catch {
      return false
    }
  })
}

// Output of the first matching custom renderer, undefined when none matches.
export function renderCustomNode(
  item: Record<string, unknown>
): string | object | undefined {
  return matchCustomNode(item)?.render(item)
}

// Own keys of an element/html_tag node; any other renderable key is a child.
export const TAG_RESERVED = new Set([
  'type',
  'theme',
  'tag',
  'value',
  'children',
  'attributes',
  'attached',
])

type NodeKind =
  'custom' | 'component' | 'icon' | 'image' | 'markup' | 'tag' | null

export function nodeKind(node: Record<string, unknown>): NodeKind {
  if (matchCustomNode(node)) return 'custom'
  const { type, theme } = node
  if (type === 'component') return 'component'
  if (type === 'icon') return 'icon'
  if (type === 'image' || theme === 'image') return 'image'
  if (
    type === 'markup' ||
    theme === 'markup' ||
    typeof node['markup'] === 'string'
  )
    return 'markup'
  if (type === 'element' || theme === 'element' || type === 'html_tag')
    return 'tag'
  return null
}
