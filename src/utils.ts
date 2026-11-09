import { dirname, sep } from 'path'

export const capitalize = (str: string) => str[0].toUpperCase() + str.slice(1)

export const convertToKebabCase = (str: string): string =>
  str.replace(/[-:]/g, '')

export const deriveGroupFromPath = (fileName: string) => {
  const dir = dirname(fileName)
  const parts = dir.split(sep).filter(Boolean)
  const lower = parts.map((p) => p.toLowerCase())
  const index = lower.lastIndexOf('components')

  // We need two segments after 'components' to count it as a real group:
  // e.g. components/atoms/button -> group = atoms
  // e.g. components/dummy -> fallback to SDC
  if (index !== -1 && parts[index + 2]) {
    return parts[index + 1]
  }

  return 'SDC'
}

// Sanitize story key to ensure it's a valid JavaScript identifier
export const sanitizeStoryKey = (key: string): string => {
  // If key starts with a digit, prefix it with an underscore
  if (/^\d/.test(key)) {
    return `_${key}`
  }
  return key
}

// Serialize a value as a JavaScript literal for generated source code.
// JSON.stringify leaves the U+2028 / U+2029 line separators unescaped; they
// are legal inside JS string literals only since ES2019 and still confuse some
// tooling, so escape them (also satisfies CodeQL js/bad-code-sanitization).
// `<` and `>` are left alone: the output is an ES module, never inline HTML.
export const jsLiteral = (value: unknown, indent?: number): string => {
  const json = JSON.stringify(value, null, indent)
  // JSON.stringify(undefined) is undefined; keep emitting the `undefined` literal.
  if (json === undefined) return 'undefined'
  return json.replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
}
