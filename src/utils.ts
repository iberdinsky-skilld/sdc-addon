import { readdirSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'

// http(s) URL as opposed to a filesystem path.
export const isRemoteUrl = (s: string): boolean => /^https?:\/\//.test(s)

export const capitalize = (str: string) => str[0].toUpperCase() + str.slice(1)

// `umami:read-more` -> `umamireadmore`: a component id as a JS identifier
// for the generated `import * as ...` bindings.
export const toIdentifier = (componentId: string): string =>
  componentId.replace(/[-:]/g, '')

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

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  v !== null &&
  typeof v === 'object' &&
  !Array.isArray(v) &&
  Object.getPrototypeOf(v) === Object.prototype

// Deep-merge addon options: plain objects merge key by key, everything else
// (arrays, functions, class instances, scalars) is replaced by the override.
// `undefined` in the override keeps the default. Inputs are never mutated.
export function mergeOptions<T extends object>(
  defaults: T,
  overrides: Partial<T> | undefined
): T {
  const out: Record<string, unknown> = {
    ...(defaults as Record<string, unknown>),
  }
  for (const [key, value] of Object.entries(overrides ?? {})) {
    if (value === undefined) continue
    const base = out[key]
    out[key] =
      isPlainObject(base) && isPlainObject(value)
        ? mergeOptions(base, value)
        : value
  }
  return out as T
}

export interface DirEntry {
  path: string
  name: string
  // Posix-style path relative to the listed root, e.g. `icons/svg/home.svg`.
  relative: string
  isDirectory: boolean
}

// Directory part of a posix relative path, '' for a top-level entry.
export const posixDirname = (rel: string): string =>
  rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : ''

// Every file and directory under `root`, recursively. A missing or
// unreadable tree yields an empty list: the scanners built on this treat
// "nothing there" and "cannot look" the same way.
export function listDir(root: string): DirEntry[] {
  let entries
  try {
    entries = readdirSync(root, { recursive: true, withFileTypes: true })
  } catch {
    return []
  }
  return entries
    .filter((entry) => entry.isFile() || entry.isDirectory())
    .map((entry) => {
      const path = join(entry.parentPath, entry.name)
      return {
        path,
        name: entry.name,
        relative: relative(root, path).split(sep).join('/'),
        isDirectory: entry.isDirectory(),
      }
    })
}
