import { capitalize, convertToKebabCase } from '../utils.ts'
import { toAttribute } from '../renderer/attributes.ts'
import { nodeKind, matchCustomNode, TAG_RESERVED } from '../renderer/nodes.ts'
import type { Component } from '../sdc.d.ts'

// drupal-attribute intentionally drops empty values (canonical Drupal).
const attrStr = (value: unknown): string => toAttribute(value).toString()

export const generateArgs = (
  args: Component['props'] | Component['slots'],
  isSlot = false
): string =>
  Object.entries(args ?? {})
    .map(([key, value]) => `${key}: ${formatArgValue(value, isSlot)},`)
    .join('\n')

const formatArgValue = (value: any, isSlot = false): string => {
  if (Array.isArray(value)) {
    const arrayContent = value.map((item) => formatArgValue(item, false))
    return `new TwigSafeArray(${arrayContent.join(', ')})`
  }
  const rendered = renderStoryNode(value)
  return isSlot ? `new TwigSafeArray(${rendered})` : rendered
}

// Build-time counterpart of the runtime resolver: classify with `nodeKind()` and
// emit a JS expression. A custom renderer returns either HTML (a literal) or a
// node (fed back through codegen).
export const renderStoryNode = (item: any): string => {
  switch (nodeKind(item)) {
    case 'custom': {
      const out = matchCustomNode(item)!.render(item)
      return typeof out === 'string'
        ? JSON.stringify(out)
        : formatArgValue(out, false)
    }
    case 'component':
      return renderComponent(item)
    case 'icon':
      return renderIcon(item)
    case 'image':
      return renderImage(item)
    case 'markup':
      return JSON.stringify(`${item.markup}`)
    case 'tag':
      return renderTag(item)
    default:
      return JSON.stringify(item)
  }
}

const renderComponent = (item: Component): string => {
  const kebabCaseName = convertToKebabCase(item.component)
  const componentProps = `...{ ${generateArgs(item.props ?? {}, false)}}, ...{${generateArgs(item.slots ?? {}, true)}}`
  const storyArgs = item.story
    ? `...${kebabCaseName}.${capitalize(item.story)}.args`
    : '...{}'
  return `${kebabCaseName}.default.component({...${kebabCaseName}.Basic.baseArgs, ${storyArgs}, ${componentProps}})`
}

const renderImage = (item: any): string => {
  const attrs: Record<string, any> = { ...(item.attributes ?? {}) }
  if (item.uri != null) attrs.src = item.uri
  if (Array.isArray(item.srcset) && item.srcset.length > 0) {
    attrs.srcset = item.srcset
      .map((s: any) =>
        s && typeof s === 'object'
          ? [s.uri, s.width].filter(Boolean).join(' ')
          : s
      )
      .join(', ')
  }
  const mapped: Record<string, any> = {
    width: item.width,
    height: item.height,
    alt: item.alt ?? '',
    sizes: item.sizes,
    title: item.title,
  }
  for (const key of ['width', 'height', 'alt', 'sizes', 'title']) {
    if (mapped[key] != null) attrs[key] = mapped[key]
  }
  return JSON.stringify(`<img${attrStr(attrs)} />`)
}

// element / html_tag → <tag attrs>children</tag>. Like Drupal, children are
// `value` plus every other renderable key (an icon under `icon:`, a numeric `0`),
// not just `value`/`children`.
const renderTag = (item: any): string => {
  const tag = item.tag ?? 'div'
  const parts: string[] = []
  const main = item.value ?? item.children
  if (main != null) parts.push(formatArgValue(main, false))
  for (const [key, value] of Object.entries(item))
    if (!TAG_RESERVED.has(key) && value !== null && typeof value === 'object')
      parts.push(formatArgValue(value, false))
  const open = JSON.stringify(`<${tag}${attrStr(item.attributes)}>`)
  const close = JSON.stringify(`</${tag}>`)
  return `(${open} + ${parts.length ? parts.join(' + ') : '""'} + ${close})`
}

const renderIcon = (item: any): string =>
  `_sdcRenderIcon(${JSON.stringify(item.pack_id)}, ${JSON.stringify(
    item.icon_id
  )}, ${JSON.stringify(item.settings ?? {})})`
