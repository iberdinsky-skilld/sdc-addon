// SDC guarantees `attributes` is always an Attribute object inside a component.
import DrupalAttribute, { type DrupalAttributeEntry } from 'drupal-attribute'
import { entries } from './collections.ts'

// Cast a plain mapping (Map / object / nothing) to a DrupalAttribute; pass an
// existing DrupalAttribute through untouched.
export function toAttribute(value: unknown): DrupalAttribute {
  const v = value as { addClass?: unknown }
  if (v && typeof v.addClass === 'function') return value as DrupalAttribute
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
  } else if (typeof vars === 'object') {
    const o = vars as Record<string, unknown>
    if (Object.prototype.hasOwnProperty.call(o, 'attributes')) {
      o['attributes'] = toAttribute(o['attributes'])
    }
  }
  return vars
}

// drupal-attribute's addClass()/removeClass()/hasClass() only array the *new*
// value, so a non-array existing `class` (a Map from a template literal, or a
// scalar) crashes them. Cast the existing class to an array first, like Drupal's
// (array) cast. Patches the shared singleton's prototype once.
export function patchDrupalAttribute(AttrClass: typeof DrupalAttribute): void {
  const proto = AttrClass.prototype as DrupalAttribute & {
    __sdcClassPatched?: boolean
  }
  if (!proto || proto.__sdcClassPatched) return
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
  ;(['addClass', 'removeClass', 'hasClass'] as const).forEach((name) => {
    const orig = proto[name] as (...a: unknown[]) => unknown
    if (typeof orig !== 'function') return
    proto[name] = function (this: DrupalAttribute, ...args: unknown[]) {
      normalize(this)
      return orig.apply(this, args)
    } as never
  })
  Object.defineProperty(proto, '__sdcClassPatched', {
    value: true,
    enumerable: false,
  })
}
