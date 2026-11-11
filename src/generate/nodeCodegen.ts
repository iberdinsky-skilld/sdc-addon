import { capitalize, jsLiteral, toIdentifier } from '../utils.ts'
import { isRecord } from '../guards.ts'
import { toAttribute } from '../renderer/attributes.ts'
import { toText } from '../renderer/collections.ts'
import { nodeKind, renderCustomNode, TAG_RESERVED } from '../renderer/nodes.ts'

// A YAML render node; fields are user input and read defensively.
type Node = Record<string, unknown>

// drupal-attribute intentionally drops empty values (canonical Drupal).
const attrStr = (value: unknown): string => toAttribute(value).toString()

export const generateArgs = (
  args: Record<string, unknown> | undefined,
  isSlot = false
): string =>
  Object.entries(args ?? {})
    .map(([key, value]) => `${key}: ${formatArgValue(value, isSlot)},`)
    .join('\n')

const formatArgValue = (value: unknown, isSlot = false): string => {
  if (Array.isArray(value)) {
    const arrayContent = value.map((item) => formatArgValue(item, false))
    return `new TwigSafeArray(${arrayContent.join(', ')})`
  }
  const rendered = renderStoryNode(value)
  return isSlot ? `new TwigSafeArray(${rendered})` : rendered
}

// Build-time twin of the runtime resolver: each node becomes a JS expression.
export const renderStoryNode = (item: unknown): string => {
  if (!isRecord(item)) return jsLiteral(item)
  switch (nodeKind(item)) {
    case 'custom': {
      const out = renderCustomNode(item)
      return typeof out === 'string'
        ? jsLiteral(out)
        : formatArgValue(out, false)
    }
    case 'component':
      return renderComponent(item)
    case 'icon':
      return renderIcon(item)
    case 'image':
      return renderImage(item)
    case 'markup':
      return jsLiteral(toText(item.markup))
    case 'tag':
      return renderTag(item)
    default:
      return jsLiteral(item)
  }
}

const renderComponent = (item: Node): string => {
  if (typeof item.component !== 'string') {
    throw new Error(
      `A "type: component" node needs a string "component" (namespace:name), got ${jsLiteral(item.component)}`
    )
  }
  const identifier = toIdentifier(item.component)
  const props = isRecord(item.props) ? item.props : {}
  const slots = isRecord(item.slots) ? item.slots : {}
  const componentProps = `...{ ${generateArgs(props, false)}}, ...{${generateArgs(slots, true)}}`
  const storyArgs =
    typeof item.story === 'string'
      ? `...${identifier}.${capitalize(item.story)}.args`
      : '...{}'
  return `${identifier}.default.component({...${identifier}.Basic.baseArgs, ${storyArgs}, ${componentProps}})`
}

// image / theme:image -> <img>; top-level fields win over `attributes`, as in
// Drupal.
const renderImage = (item: Node): string => {
  const attrs: Node = isRecord(item.attributes) ? { ...item.attributes } : {}
  if (item.uri != null) attrs.src = item.uri
  if (Array.isArray(item.srcset) && item.srcset.length > 0) {
    attrs.srcset = item.srcset
      .map((s: unknown) =>
        isRecord(s) ? [s.uri, s.width].filter(Boolean).join(' ') : s
      )
      .join(', ')
  }
  const mapped: Node = {
    width: item.width,
    height: item.height,
    alt: item.alt ?? '',
    sizes: item.sizes,
    title: item.title,
  }
  for (const [key, value] of Object.entries(mapped)) {
    if (value != null) attrs[key] = value
  }
  return jsLiteral(`<img${attrStr(attrs)} />`)
}

// element / html_tag -> <tag>; children are `value` plus every other renderable
// key, as in Drupal.
const renderTag = (item: Node): string => {
  const tag = toText(item.tag) || 'div'
  const parts: string[] = []
  const main = item.value ?? item.children
  if (main != null) parts.push(formatArgValue(main, false))
  for (const [key, value] of Object.entries(item))
    if (!TAG_RESERVED.has(key) && value !== null && typeof value === 'object')
      parts.push(formatArgValue(value, false))
  const open = jsLiteral(`<${tag}${attrStr(item.attributes)}>`)
  const close = jsLiteral(`</${tag}>`)
  return `(${open} + ${parts.length ? parts.join(' + ') : '""'} + ${close})`
}

const renderIcon = (item: Node): string =>
  `_sdcRenderIcon(${jsLiteral(item.pack_id)}, ${jsLiteral(
    item.icon_id
  )}, ${jsLiteral(item.settings ?? {})})`
