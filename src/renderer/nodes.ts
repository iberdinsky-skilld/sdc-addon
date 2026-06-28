import { toAttribute } from './attributes.ts'
import type { CustomNode } from '../sdc.d.ts'
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

// User-defined node types. One registry, consulted by both the build-time
// codegen and this runtime resolver. `render` returns an HTML string or a node
// (re-resolved through the pipeline), so a custom node works everywhere.
let customNodes: CustomNode[] = []

export function registerCustomNodes(list: CustomNode[] | undefined): void {
  customNodes = list ?? []
}

export function matchCustomNode(node: unknown): CustomNode | undefined {
  return customNodes.find((c) => {
    try {
      return c.match(node)
    } catch {
      return false
    }
  })
}

export type NodeKind =
  | 'custom'
  | 'component'
  | 'icon'
  | 'image'
  | 'markup'
  | 'tag'
  | null

// Single source of truth for classifying a render-array node.
export function nodeKind(node: unknown): NodeKind {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return null
  if (typeof (node as { addClass?: unknown }).addClass === 'function')
    return null
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
    const r = resolve(value)
    return r == null ? '' : String(r)
  }

  function renderNode(node: unknown): string {
    switch (nodeKind(node)) {
      case 'custom': {
        const out = matchCustomNode(node)?.render(node)
        if (out == null) return ''
        return typeof out === 'string' ? out : toHtml(out)
      }
      case 'component':
        return renderers.renderComponent(node)
      case 'icon':
        return renderers.renderIcon(
          String(nodeGet(node, 'pack_id') ?? ''),
          String(nodeGet(node, 'icon_id') ?? ''),
          nodeGet(node, 'settings') ?? {}
        )
      case 'image': {
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
      case 'markup':
        return String(nodeGet(node, 'markup') ?? '')
      case 'tag': {
        const tag = String(nodeGet(node, 'tag') ?? 'div')
        const children = toHtml(
          nodeGet(node, 'value') ?? nodeGet(node, 'children')
        )
        return `<${tag}${attributesString(node)}>${children}</${tag}>`
      }
      default:
        return ''
    }
  }

  return { resolve }
}
