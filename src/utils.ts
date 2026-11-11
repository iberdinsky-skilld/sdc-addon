import { readdirSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'

export const isRemoteUrl = (s: string): boolean => /^https?:\/\//.test(s)

export const capitalize = (str: string): string =>
  str.charAt(0).toUpperCase() + str.slice(1)

// `umami:read-more` -> `umamireadmore`
export const toIdentifier = (componentId: string): string =>
  componentId.replace(/[-:]/g, '')

export const deriveGroupFromPath = (fileName: string) => {
  const dir = dirname(fileName)
  const parts = dir.split(sep).filter(Boolean)
  const lower = parts.map((p) => p.toLowerCase())
  const index = lower.lastIndexOf('components')

  // components/atoms/button -> atoms; components/button -> SDC
  const group = parts[index + 1]
  if (index !== -1 && group && parts[index + 2]) {
    return group
  }

  return 'SDC'
}

// Story keys starting with a digit get a `_` prefix.
export const sanitizeStoryKey = (key: string): string => {
  if (/^\d/.test(key)) {
    return `_${key}`
  }
  return key
}

// A value as a JS literal for generated code. U+2028/U+2029 are escaped (they
// trip some tooling); `<`/`>` stay as is, the output is never inline HTML.
// JSON.stringify returns undefined for undefined, functions and symbols.
const toJson = (value: unknown, indent?: number): string | undefined =>
  JSON.stringify(value, null, indent)

export const jsLiteral = (value: unknown, indent?: number): string => {
  const json = toJson(value, indent)
  if (json === undefined) return 'undefined'
  return json.replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  v !== null &&
  typeof v === 'object' &&
  !Array.isArray(v) &&
  Object.getPrototypeOf(v) === Object.prototype

// Deep merge: plain objects merge per key, anything else is replaced.
// `undefined` keeps the default; inputs are not mutated.
export function mergeOptions<T extends object>(
  defaults: T,
  overrides: { [K in keyof T]?: T[K] | undefined } | undefined
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
  // Posix path relative to the listed root.
  relative: string
  isDirectory: boolean
}

// Directory of a posix relative path, '' at the top level.
export const posixDirname = (rel: string): string =>
  rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : ''

// Every file and directory under `root`; [] when missing or unreadable.
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
