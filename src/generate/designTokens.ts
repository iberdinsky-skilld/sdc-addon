// Drupal's design tokens (`<ns>.tokens.yml`, DTCG) as CSS variables, following
// core's naming and value serialization.
import { readFileSync } from 'node:fs'
import { parse as parseYaml } from 'yaml'
import { logger } from '../logger.ts'
import { isRecord, isString } from '../guards.ts'
import { namespaceFiles, type NamespaceRoots } from './namespaces.ts'

interface Token {
  path: string
  type: string | undefined
  value: unknown
}

const flatten = (
  group: Record<string, unknown>,
  path: string[],
  type: string | undefined
): Token[] => {
  const groupType = isString(group['$type']) ? group['$type'] : type
  return Object.entries(group).flatMap(([key, node]) => {
    if (key.startsWith('$') || !isRecord(node)) return []
    const nodeType = isString(node['$type']) ? node['$type'] : groupType
    return '$value' in node
      ? [
          {
            path: [...path, key].join('.'),
            type: nodeType,
            value: node['$value'],
          },
        ]
      : flatten(node, [...path, key], nodeType)
  })
}

export const cssVariableName = (path: string): string =>
  `--${path.replace(/[_ .]/g, '-')}`

const FONT_WEIGHTS: Record<string, number> = {
  thin: 100,
  hairline: 100,
  'extra-light': 200,
  'ultra-light': 200,
  light: 300,
  normal: 400,
  regular: 400,
  book: 400,
  medium: 500,
  'semi-bold': 600,
  'demi-bold': 600,
  bold: 700,
  'extra-bold': 800,
  'ultra-bold': 800,
  black: 900,
  heavy: 900,
  'extra-black': 950,
  'ultra-black': 950,
}

const dimension = (value: unknown): string =>
  isRecord(value)
    ? `${String(value['value'])}${String(value['unit'])}`
    : String(value)

// Html::escape(), as core does for font names.
const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

const fontFamily = (value: unknown): string =>
  (Array.isArray(value) ? value : [value])
    .map((name) => escapeHtml(String(name)))
    .join(', ')

const fontWeight = (value: unknown): string =>
  String(isString(value) ? (FONT_WEIGHTS[value] ?? value) : value)

// `{color.palette.violet}` refers to another token.
const ALIAS = /^\{([^{}]+)\}$/

export const cssValue = (type: string | undefined, value: unknown): string => {
  if (isString(value)) {
    const alias = ALIAS.exec(value)?.[1]
    if (alias) return `var(${cssVariableName(alias)})`
  }
  switch (type) {
    case 'dimension':
      return dimension(value)
    case 'fontFamily':
      return fontFamily(value)
    case 'fontWeight':
      return fontWeight(value)
    case 'typography':
      return isRecord(value)
        ? [
            fontWeight(value['fontWeight']),
            `${dimension(value['fontSize'])}/${String(value['lineHeight'])}`,
            fontFamily(value['fontFamily']),
          ].join(' ')
        : String(value)
    case 'color':
      return isRecord(value) && isString(value['hex'])
        ? value['hex']
        : String(value)
    default:
      return String(value)
  }
}

export const readTokens = (file: string): Token[] => {
  try {
    const data: unknown = parseYaml(readFileSync(file, 'utf8'))
    return isRecord(data) ? flatten(data, [], undefined) : []
  } catch (error) {
    logger.warn(`Could not read design tokens ${file}: ${String(error)}`)
    return []
  }
}

export const tokenFiles = (namespaces: NamespaceRoots): string[] =>
  namespaceFiles(namespaces, 'tokens').map(([, file]) => file)

// Scoped like core's output; token files only define the default scope.
export const designTokensCss = (namespaces: NamespaceRoots): string => {
  const variables = tokenFiles(namespaces)
    .flatMap(readTokens)
    .map(
      ({ path, type, value }) =>
        `${cssVariableName(path)}:${cssValue(type, value)};`
    )
  return variables.length > 0 ? `:root{${variables.join('')}}` : ''
}
