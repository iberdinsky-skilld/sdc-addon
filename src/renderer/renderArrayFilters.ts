// Drupal core's |add_class and |set_attribute filters. In Drupal they set
// #attributes on a render array, which lands on its root tag; here a slot is
// already HTML, so the root tag of each item gets the class or attribute.
import { PrintableArray } from './nodes.ts'
import { entries, toText } from './collections.ts'

const ROOT_TAG = /^(\s*(?:<!--[\s\S]*?-->\s*)*)<([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/

const escapeAttribute = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/"/g, '&quot;')

const attributePattern = (name: string): RegExp =>
  new RegExp(`\\s${name.replace(/[^\w:-]/g, '')}\\s*=\\s*("([^"]*)"|'([^']*)')`)

// Text without a root tag stays as it is, like #markup in Drupal.
const onRootTag = (html: string, change: (attrs: string) => string): string =>
  html.replace(
    ROOT_TAG,
    (_m, before: string, tag: string, attrs: string, close: string) =>
      `${before}<${tag}${change(attrs)}${close}>`
  )

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
        ? classNames(entries(value).map(([, item]) => item))
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
