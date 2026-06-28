import { describe, expect, test } from 'vitest'
import twing from 'twing'
// @ts-ignore — @christianwiedemann/drupal-twig-extensions ships no types
import { addDrupalExtensions } from '@christianwiedemann/drupal-twig-extensions/twing'
import DrupalAttribute from 'drupal-attribute'
import { toAttribute, castVarsAttributes } from '../renderer/attributes.ts'
import { createTwingWrapperRuntime } from '../renderer/twingWrapper.ts'

const { createSynchronousEnvironment, createSynchronousArrayLoader } =
  twing as unknown as {
    createSynchronousEnvironment: (loader: unknown) => {
      render: (name: string, ctx: unknown) => string
      functions: Map<string, unknown>
    }
    createSynchronousArrayLoader: (t: Record<string, string>) => unknown
  }

describe('nested include attributes cast (twing)', () => {
  // ── unit: the typed runtime helpers ────────────────────────────────────────
  test('toAttribute casts a plain object to a DrupalAttribute', () => {
    const a = toAttribute({ id: 'foo' })
    expect(typeof a.addClass).toBe('function')
    expect(a.addClass('x').toString()).toContain('id="foo"')
  })

  test('toAttribute casts a Twing Map', () => {
    const a = toAttribute(new Map([['id', 'foo']]))
    expect(typeof a.addClass).toBe('function')
    expect(a.toString()).toContain('id="foo"')
  })

  test('toAttribute leaves an existing DrupalAttribute untouched', () => {
    const existing = new DrupalAttribute([['id', 'bar']])
    expect(toAttribute(existing)).toBe(existing)
  })

  test('toAttribute(undefined) yields an empty DrupalAttribute', () => {
    const a = toAttribute(undefined)
    expect(typeof a.addClass).toBe('function')
    expect(a.toString()).toBe('')
  })

  test('castVarsAttributes casts only the attributes key', () => {
    const vars = new Map<string, unknown>([
      ['attributes', { id: 'foo' }],
      ['label', 'Go'],
    ])
    castVarsAttributes(vars)
    expect(
      typeof (vars.get('attributes') as { addClass?: unknown }).addClass
    ).toBe('function')
    expect(vars.get('label')).toBe('Go')
  })

  test('castVarsAttributes leaves vars without an attributes key alone', () => {
    const vars = new Map<string, unknown>([['label', 'Go']])
    expect(() => castVarsAttributes(vars)).not.toThrow()
    expect(vars.has('attributes')).toBe(false)
  })

  test('castVarsAttributes also handles a plain-object vars bag', () => {
    const vars: Record<string, unknown> = {
      attributes: { id: 'foo' },
      label: 'Go',
    }
    castVarsAttributes(vars)
    expect(typeof (vars.attributes as { addClass?: unknown }).addClass).toBe(
      'function'
    )
    expect(vars.label).toBe('Go')
    // object without attributes key is left untouched
    const bare: Record<string, unknown> = { label: 'x' }
    castVarsAttributes(bare)
    expect('attributes' in bare).toBe(false)
  })

  // ── integration: the real factory wires the include override ───────────────
  function makeEnv() {
    const loader = createSynchronousArrayLoader({
      child:
        "<button{{ attributes.addClass('btn').setAttribute('type','button') }}>{{ label }}</button>",
      plain:
        "{{ include('child', { attributes: { 'data-bs-toggle': 'modal' }, label: 'Go' }, with_context = false) }}",
      already:
        "{{ include('child', { attributes: create_attribute({ id: 'bar', class: ['pre'] }), label: 'A' }, with_context = false) }}",
    })
    const env = createSynchronousEnvironment(loader)
    addDrupalExtensions(env as never)
    return env
  }

  test('without the runtime, a plain-hash attributes include renders bare (regression)', () => {
    const env = makeEnv()
    expect(env.render('plain', {})).toBe('<button>Go</button>')
  })

  test('createTwingWrapperRuntime().registerSdcRuntime wires the include cast', () => {
    const env = makeEnv()
    createTwingWrapperRuntime({}).registerSdcRuntime(env as never)
    const out = env.render('plain', {})
    expect(out).toContain('data-bs-toggle="modal"')
    expect(out).toContain('class="btn"')
    expect(out).toContain('type="button"')
  })

  test('an already-built DrupalAttribute is passed through (merged, not wiped)', () => {
    const env = makeEnv()
    createTwingWrapperRuntime({}).registerSdcRuntime(env as never)
    const out = env.render('already', {})
    expect(out).toContain('id="bar"')
    expect(out).toContain('class="pre btn"')
  })
})
