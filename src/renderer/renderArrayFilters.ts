// Drupal core's |add_class and |set_attribute, on the root tag of rendered HTML.
import { PrintableArray } from './nodes.ts'
import { toList, toText } from './collections.ts'

const OPEN_TAG = /^<([a-zA-Z][\w:-]*)([^>]*)>/

const escapeAttribute = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/"/g, '&quot;')

const attributePattern = (name: string): RegExp =>
  new RegExp(`\\s${name.replace(/[^\w:-]/g, '')}\\s*=\\s*("([^"]*)"|'([^']*)')`)

// Skips leading whitespace and comments with indexOf, not a regex (ReDoS).
const rootTagStart = (html: string): number => {
  let i = 0
  for (;;) {
    while (i < html.length && /\s/.test(html.charAt(i))) i++
    if (!html.startsWith('<!--', i)) return i
    const end = html.indexOf('-->', i + 4)
    if (end < 0) return -1
    i = end + 3
  }
}

// Text without a root tag stays as it is, like #markup in Drupal.
const onRootTag = (html: string, change: (attrs: string) => string): string => {
  const start = rootTagStart(html)
  if (start < 0) return html
  return (
    html.slice(0, start) +
    html.slice(start).replace(OPEN_TAG, (_m, tag: string, attrs: string) => {
      const selfClosing = attrs.endsWith('/')
      const own = selfClosing ? attrs.slice(0, -1) : attrs
      return `<${tag}${change(own)}${selfClosing ? '/' : ''}>`
    })
  )
}

const eachItem = (
  value: unknown,
  change: (html: string) => string
): unknown => {
  if (value instanceof PrintableArray)
    return new PrintableArray(...[...value].map((item) => change(toText(item))))
  if (Array.isArray(value)) return value.map((item) => change(toText(item)))
  return value == null ? value : change(toText(value))
}

const classNames = (values: unknown[]): string[] =>
  values.flatMap((value) =>
    typeof value === 'string'
      ? value.split(/\s+/)
      : value !== null && typeof value === 'object'
        ? classNames(toList(value))
        : value == null
          ? []
          : [toText(value)]
  )

export function addClass(value: unknown, ...classes: unknown[]): unknown {
  const added = classNames(classes).filter(Boolean)
  if (!added.length) return value
  return eachItem(value, (html) =>
    onRootTag(html, (attrs) => {
      const existing = attributePattern('class').exec(attrs)
      const current = (existing?.[2] ?? existing?.[3] ?? '').split(/\s+/)
      const merged = [...new Set([...current, ...added].filter(Boolean))]
      const attribute = ` class="${escapeAttribute(merged.join(' '))}"`
      return existing
        ? attrs.replace(attributePattern('class'), attribute)
        : `${attrs}${attribute}`
    })
  )
}

export function setAttribute(
  value: unknown,
  name: unknown,
  attributeValue?: unknown
): unknown {
  const attributeName = toText(name)
  if (!attributeName) return value
  const attribute =
    attributeValue == null || attributeValue === false
      ? ''
      : attributeValue === true
        ? ` ${attributeName}`
        : ` ${attributeName}="${escapeAttribute(toText(attributeValue))}"`
  return eachItem(value, (html) =>
    onRootTag(html, (attrs) =>
      attributePattern(attributeName).test(attrs)
        ? attrs.replace(attributePattern(attributeName), attribute)
        : `${attrs}${attribute}`
    )
  )
}
