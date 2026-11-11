// SDC guarantees `attributes` is always an Attribute object inside a component.
import DrupalAttribute, { type DrupalAttributeEntry } from 'drupal-attribute'
import { isRecord } from '../guards.ts'
import { entries, TWIG_JS_KEYS } from './collections.ts'

// Duck-typed: twig.js and Twing bundle separate DrupalAttribute classes.
export const isDrupalAttribute = (value: unknown): value is DrupalAttribute =>
  typeof value === 'object' &&
  value !== null &&
  'addClass' in value &&
  typeof value.addClass === 'function'

// Map / object / nothing -> DrupalAttribute; an attribute passes through.
export function toAttribute(value: unknown): DrupalAttribute {
  if (isDrupalAttribute(value)) return value
  // drupal-attribute takes more value shapes than its types list (Twing Maps).
  return new DrupalAttribute(
    entries(value) as Array<[string, DrupalAttributeEntry]>
  )
}

// Cast the `attributes` key of an include()/embed variables bag in place.
export function castVarsAttributes(vars: unknown): unknown {
  if (vars == null) return vars
  if (vars instanceof Map) {
    if (vars.has('attributes')) {
      vars.set('attributes', toAttribute(vars.get('attributes')))
    }
  } else if (isRecord(vars)) {
    if (Object.prototype.hasOwnProperty.call(vars, 'attributes')) {
      vars['attributes'] = toAttribute(vars['attributes'])
    }
  }
  return vars
}

// addClass/removeClass/hasClass crash on a non-array existing `class` (a Twing
// Map, a scalar); cast it to an array first, like Drupal.
const PATCHED = '__sdcClassPatched'

export function patchDrupalAttribute(AttrClass: typeof DrupalAttribute): void {
  const proto = AttrClass.prototype
  // On the prototype: the twig.js and Twing bundles share drupal-attribute.
  if (Object.prototype.hasOwnProperty.call(proto, PATCHED)) return
  const normalize = (self: DrupalAttribute): void => {
    if (typeof self.get !== 'function') return
    const existing = self.get('class')
    if (existing == null || Array.isArray(existing)) return
    if (existing instanceof Map) {
      self.set('class', Array.from(existing.values()))
    } else if (typeof existing === 'string') {
      self.set('class', existing === '' ? [] : [existing])
    } else {
      self.set('class', [existing])
    }
  }
  for (const name of ['addClass', 'removeClass', 'hasClass'] as const) {
    const original: unknown = Reflect.get(proto, name)
    if (typeof original !== 'function') continue
    Reflect.set(
      proto,
      name,
      function (this: DrupalAttribute, ...args: unknown[]): unknown {
        normalize(this)
        const result: unknown = Reflect.apply(original, this, args)
        return result
      }
    )
  }
  const set: unknown = Reflect.get(proto, 'set')
  if (typeof set === 'function') {
    Reflect.set(
      proto,
      'set',
      function (this: DrupalAttribute, key: unknown, value: unknown): unknown {
        if (key === TWIG_JS_KEYS) return this
        const result: unknown = Reflect.apply(set, this, [key, value])
        return result
      }
    )
  }
  Object.defineProperty(proto, PATCHED, {
    value: true,
    enumerable: false,
  })
}
