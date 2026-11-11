// Twig's html_cva() on top of class-variance-authority; hashes may arrive as
// Twing Maps or twig.js objects.
import { cva } from 'class-variance-authority'
import { isString } from '../guards.ts'
import { entries, toText } from './collections.ts'

const list = (value: unknown): unknown[] => {
  if (value == null) return []
  if (Array.isArray(value)) return value
  if (value instanceof Map) return [...value.values()]
  return [value]
}

const hash = <T>(value: unknown, item: (v: unknown) => T): Record<string, T> =>
  Object.fromEntries(entries(value).map(([k, v]) => [toText(k), item(v)]))

// Twig keeps string classes only; variant names compare as strings.
const classes = (value: unknown): string[] => list(value).filter(isString)

export function htmlCva(
  base: unknown = [],
  variants: unknown = {},
  compoundVariants: unknown = [],
  defaultVariant: unknown = {}
) {
  const resolve = cva(classes(base), {
    variants: hash(variants, (names) => hash(names, classes)),
    defaultVariants: hash(defaultVariant, toText),
    compoundVariants: list(compoundVariants).map((compound) =>
      Object.fromEntries(
        entries(compound).map(([key, value]) => [
          toText(key),
          key === 'class' ? classes(value) : list(value).map(toText),
        ])
      )
    ),
  })
  return {
    apply(recipes: unknown, ...additionalClasses: unknown[]): string {
      // null keeps the default, and repeated classes print once, as in Twig.
      const props = hash(recipes, (v) => (v == null ? undefined : toText(v)))
      const output = [resolve(props), ...classes(additionalClasses)].join(' ')
      return [...new Set(output.split(/\s+/).filter(Boolean))].join(' ')
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
