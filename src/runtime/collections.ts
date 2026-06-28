// Map/iterable helpers — Twing represents array/hash literals as JS Maps.

// Any iterable-ish value to [key, value] entries (Map branch covers DrupalAttribute).
export function entries(value: unknown): Array<[unknown, unknown]> {
  if (value == null) return []
  if (value instanceof Map) return [...value.entries()]
  if (Array.isArray(value)) return value.map((x, i) => [i, x])
  if (typeof value === 'object') return Object.entries(value as object)
  return []
}

// Deep-convert Twing Maps to plain objects, preserving DrupalAttribute (a Map
// subclass) so its addClass()/toString() survive.
export function toPlain(value: unknown): unknown {
  if (
    value instanceof Map &&
    typeof (value as { addClass?: unknown }).addClass !== 'function'
  ) {
    const out: Record<string, unknown> = {}
    value.forEach((v, k) => {
      out[k as string] = toPlain(v)
    })
    return out
  }
  return value
}
