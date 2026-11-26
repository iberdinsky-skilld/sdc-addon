// Twig's html_cva(), ported from Twig\Extra\Html\Cva; hashes may arrive as
// Twing Maps or twig.js objects.
import { isString } from '../guards.ts'
import { entries, toText } from './collections.ts'

const list = (value: unknown): unknown[] => {
  if (value == null) return []
  if (Array.isArray(value)) return value
  if (value instanceof Map) return [...value.values()]
  return [value]
}

const map = (value: unknown): Map<string, unknown> =>
  new Map(entries(value).map(([k, v]) => [toText(k), v]))

// Booleans pick the 'true' / 'false' variant, as in Twig.
const variantName = (value: unknown): string =>
  typeof value === 'boolean'
    ? String(value)
    : value == null
      ? ''
      : toText(value)

export function htmlCva(
  base: unknown = [],
  variants: unknown = {},
  compoundVariants: unknown = [],
  defaultVariant: unknown = {}
) {
  const groups = map(variants)
  const classesOf = (group: string, value: unknown): unknown[] =>
    list(map(groups.get(group)).get(variantName(value)))

  return {
    apply(recipes: unknown, ...additionalClasses: unknown[]): string {
      const given = map(recipes)
      const isSet = (name: string) => given.get(name) != null
      // Compounds see only the given recipes; defaults come after them.
      const classes = [
        ...list(base),
        ...[...given].flatMap(([name, value]) => classesOf(name, value)),
        ...list(compoundVariants).flatMap((compound) => {
          const conditions = map(compound)
          const matches = [...conditions].every(
            ([name, values]) =>
              name === 'class' ||
              (isSet(name) && list(values).includes(given.get(name)))
          )
          return matches ? list(conditions.get('class')) : []
        }),
        ...[...map(defaultVariant)].flatMap(([name, value]) =>
          isSet(name) ? [] : classesOf(name, value)
        ),
        ...additionalClasses,
      ].filter(isString)
      return [...new Set(classes.join(' ').split(/\s+/).filter(Boolean))].join(
        ' '
      )
    },
  }
}

export const HTML_CVA_ARGUMENTS = [
  'base',
  'variants',
  'compound_variants',
  'default_variant',
] as const

// twig.js has no named arguments: `f(base: 'x')` reaches the function as the
// parser's `:` token followed by the value. Map them back to positions.
export function twigJsArguments(
  args: unknown[],
  names: readonly string[]
): unknown[] {
  const camel = (s: string) =>
    s.replace(/_(\w)/g, (_m, c: string) => c.toUpperCase())
  const positional: unknown[] = []
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const key =
      typeof arg === 'object' &&
      arg !== null &&
      'operator' in arg &&
      arg.operator === ':' &&
      'key' in arg &&
      typeof arg.key === 'string'
        ? arg.key
        : undefined
    if (key === undefined) {
      positional.push(arg)
      continue
    }
    const index = names.findIndex((n) => camel(n) === camel(key))
    if (index >= 0) positional[index] = args[i + 1]
    i++
  }
  return positional
}
