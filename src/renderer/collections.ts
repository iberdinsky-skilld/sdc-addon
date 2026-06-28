// Map/iterable helpers — Twing represents array/hash literals as JS Maps.

// Any iterable-ish value to [key, value] entries (Map branch covers DrupalAttribute).
export function entries(value: unknown): Array<[unknown, unknown]> {
  if (value == null) return []
  if (value instanceof Map) return [...value.entries()]
  if (Array.isArray(value)) return value.map((x, i) => [i, x])
  if (typeof value === 'object') return Object.entries(value as object)
  return []
}
