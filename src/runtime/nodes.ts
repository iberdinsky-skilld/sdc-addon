import { toAttribute } from './attributes.ts'
export class PrintableArray {
  readonly length: number;
  [index: number]: unknown
  constructor(...items: unknown[]) {
    for (let i = 0; i < items.length; i++) this[i] = items[i]
    this.length = items.length
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
  return node instanceof Map
    ? node.get(key)
    : (node as Record<string, unknown>)[key]
}

const NODE_TYPES = new Set([
  'component',
  'html_tag',
  'element',
  'image',
  'icon',
])

function isNode(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  if (typeof (value as { addClass?: unknown }).addClass === 'function')
    return false
  const type = nodeGet(value, 'type')
  if (NODE_TYPES.has(type as string)) return true
  if (type === 'markup' || typeof nodeGet(value, 'markup') === 'string')
    return true
  const theme = nodeGet(value, 'theme')
  return theme === 'image' || theme === 'element'
}

function attributesString(node: unknown): string {
  return toAttribute(nodeGet(node, 'attributes')).toString()
}

export interface NodeRenderers {
  renderComponent: (node: unknown) => string
  renderIcon: (packId: string, iconId: string, settings: unknown) => string
}

export function createNodeResolver(renderers: NodeRenderers) {
  function resolve(value: unknown): unknown {
    if (value == null) return value
    if (Array.isArray(value)) return new PrintableArray(...value.map(resolve))
    if (isNode(value)) return renderNode(value)
    return value
  }

  function toHtml(value: unknown): string {
    const r = resolve(value)
    return r == null ? '' : String(r)
  }

  function renderNode(node: unknown): string {
    const type = (nodeGet(node, 'type') ?? nodeGet(node, 'theme')) as string
    if (type === 'markup' || typeof nodeGet(node, 'markup') === 'string') {
      return String(nodeGet(node, 'markup') ?? '')
    }
    if (type === 'component') return renderers.renderComponent(node)
    if (type === 'icon') {
      return renderers.renderIcon(
        String(nodeGet(node, 'pack_id') ?? ''),
        String(nodeGet(node, 'icon_id') ?? ''),
        nodeGet(node, 'settings') ?? {}
      )
    }
    if (type === 'image') {
      const attrs = toAttribute(nodeGet(node, 'attributes'))
      if (nodeGet(node, 'uri') != null) {
        attrs.setAttribute('src', nodeGet(node, 'uri') as never)
      }
      for (const k of ['width', 'height', 'alt', 'sizes', 'title']) {
        if (nodeGet(node, k) != null)
          attrs.setAttribute(k, nodeGet(node, k) as never)
      }
      return `<img${attrs.toString()} />`
    }
    // html_tag | element
    const tag = String(nodeGet(node, 'tag') ?? 'div')
    const children = toHtml(nodeGet(node, 'value') ?? nodeGet(node, 'children'))
    return `<${tag}${attributesString(node)}>${children}</${tag}>`
  }

  return { resolve }
}
