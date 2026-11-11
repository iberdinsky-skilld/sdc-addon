import { isRecord } from '../guards.ts'
import { isDrupalAttribute, toAttribute } from './attributes.ts'
import {
  entries,
  toAttributeEntry,
  toPlainObject,
  toText,
} from './collections.ts'
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

export function nodeGet(node: unknown, key: string): unknown {
  if (node instanceof Map) {
    const value: unknown = node.get(key)
    return value
  }
  return isRecord(node) ? node[key] : undefined
}

// Custom node registry, shared by the build codegen and the runtime.
let customNodes: CustomNode[] = []

export function registerCustomNodes(list: CustomNode[] | undefined): void {
  customNodes = list ?? []
}

function matchCustomNode(node: unknown): CustomNode | undefined {
  const item = toPlainObject(node)
  if (!item) return undefined
  return customNodes.find((c) => {
    try {
      return c.match(item)
    } catch {
      return false
    }
  })
}

// Output of the first matching custom renderer, undefined when none matches.
export function renderCustomNode(node: unknown): string | object | undefined {
  const item = toPlainObject(node)
  if (!item) return undefined
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

export type NodeKind =
  'custom' | 'component' | 'icon' | 'image' | 'markup' | 'tag' | null

export function nodeKind(node: unknown): NodeKind {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return null
  if (isDrupalAttribute(node)) return null
  if (matchCustomNode(node)) return 'custom'
  const type = nodeGet(node, 'type')
  const theme = nodeGet(node, 'theme')
  if (type === 'component') return 'component'
  if (type === 'icon') return 'icon'
  if (type === 'image' || theme === 'image') return 'image'
  if (
    type === 'markup' ||
    theme === 'markup' ||
    typeof nodeGet(node, 'markup') === 'string'
  )
    return 'markup'
  if (type === 'element' || theme === 'element' || type === 'html_tag')
    return 'tag'
  return null
}

function attributesString(node: unknown): string {
  return toAttribute(nodeGet(node, 'attributes')).toString()
}

// Context of a `type: component` node: resolved props and slots, and
// `attributes` as a DrupalAttribute.
export function componentNodeContext(
  node: unknown,
  resolve: (value: unknown) => unknown
): Record<string, unknown> {
  const ctx: Record<string, unknown> = {}
  for (const src of [nodeGet(node, 'props'), nodeGet(node, 'slots')]) {
    for (const [k, v] of entries(src)) ctx[toText(k)] = resolve(v)
  }
  ctx['attributes'] = toAttribute(ctx['attributes'])
  return ctx
}

export interface NodeRenderers {
  renderComponent: (node: unknown) => string
  renderIcon: (packId: string, iconId: string, settings: unknown) => string
}

export function createNodeResolver(renderers: NodeRenderers) {
  function resolve(value: unknown): unknown {
    if (value == null) return value
    if (Array.isArray(value)) return new PrintableArray(...value.map(resolve))
    if (nodeKind(value) !== null) return renderNode(value)
    return value
  }

  function toHtml(value: unknown): string {
    return toText(resolve(value))
  }

  function renderNode(node: unknown): string {
    switch (nodeKind(node)) {
      case 'custom': {
        const out = renderCustomNode(node)
        if (out == null) return ''
        return typeof out === 'string' ? out : toHtml(out)
      }
      case 'component':
        return renderers.renderComponent(node)
      case 'icon':
        return renderers.renderIcon(
          toText(nodeGet(node, 'pack_id')),
          toText(nodeGet(node, 'icon_id')),
          nodeGet(node, 'settings') ?? {}
        )
      case 'image': {
        const attrs = toAttribute(nodeGet(node, 'attributes'))
        if (nodeGet(node, 'uri') != null) {
          attrs.setAttribute('src', toAttributeEntry(nodeGet(node, 'uri')))
        }
        for (const k of ['width', 'height', 'alt', 'sizes', 'title']) {
          if (nodeGet(node, k) != null)
            attrs.setAttribute(k, toAttributeEntry(nodeGet(node, k)))
        }
        return `<img${attrs.toString()} />`
      }
      case 'markup':
        return toText(nodeGet(node, 'markup'))
      case 'tag': {
        const tag = toText(nodeGet(node, 'tag')) || 'div'
        const parts: string[] = []
        const main = nodeGet(node, 'value') ?? nodeGet(node, 'children')
        if (main != null) parts.push(toHtml(main))
        for (const [key, value] of entries(node))
          if (
            !TAG_RESERVED.has(toText(key)) &&
            value !== null &&
            typeof value === 'object'
          )
            parts.push(toHtml(value))
        return `<${tag}${attributesString(node)}>${parts.join('')}</${tag}>`
      }
      default:
        return ''
    }
  }

  return { resolve }
}
