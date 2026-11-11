// Map/iterable helpers: Twing represents arrays and hashes as Maps.
import type { DrupalAttributeEntry } from 'drupal-attribute'
import { isRecord } from '../guards.ts'

// Key order of a twig.js hash literal; its own key order is reversed.
export const TWIG_JS_KEYS = '_keys'

// [key, value] entries of a Map, array or object.
export function entries(value: unknown): Array<[unknown, unknown]> {
  if (value == null) return []
  if (value instanceof Map) return [...value.entries()]
  if (Array.isArray(value)) return value.map((x, i) => [i, x])
  if (typeof value === 'object') {
    const order: unknown = Reflect.get(value, TWIG_JS_KEYS)
    const keys = Array.isArray(order) ? order.map(String) : []
    for (const key of Object.keys(value))
      if (key !== TWIG_JS_KEYS && !keys.includes(key)) keys.push(key)
    return keys.map((key): [unknown, unknown] => [key, Reflect.get(value, key)])
  }
  return []
}

// Text of a template value through its own toString; plain objects render ''.
export function toText(value: unknown): string {
  if (typeof value === 'string') return value
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  )
    return String(value)
  if (typeof value === 'object' && value !== null) {
    const own: unknown = Reflect.get(value, 'toString')
    if (typeof own === 'function' && own !== Object.prototype.toString)
      return String(Reflect.apply(own, value, []))
  }
  return ''
}

// A hash as a plain object (Twing passes Maps); undefined for anything else.
export function toPlainObject(
  value: unknown
): Record<string, unknown> | undefined {
  if (value instanceof Map)
    return Object.fromEntries(entries(value).map(([k, v]) => [toText(k), v]))
  return isRecord(value) ? value : undefined
}

// A value as something DrupalAttribute.setAttribute accepts.
export function toAttributeEntry(value: unknown): DrupalAttributeEntry {
  if (value == null || typeof value === 'string' || typeof value === 'boolean')
    return value
  if (Array.isArray(value)) return value.map(toText)
  if (typeof value === 'object')
    return Object.fromEntries(entries(value).map(([k, v]) => [toText(k), v]))
  return toText(value)
}
