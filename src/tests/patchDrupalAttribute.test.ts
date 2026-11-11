import { describe, expect, test, beforeAll } from 'vitest'
import DrupalAttribute from 'drupal-attribute'
import twing from 'twing'
import { addDrupalExtensions } from '@christianwiedemann/drupal-twig-extensions/twing'
import { patchDrupalAttribute, toAttribute } from '../renderer/attributes.ts'

// Twing passes `class` as a Map and templates may put a scalar there; build
// through the runtime cast, which keeps both.
const withClass = (value: unknown): DrupalAttribute =>
  toAttribute({ class: value })

describe('patchDrupalAttribute', () => {
  beforeAll(() => {
    // The real singleton, as used by create_attribute() and the component render.
    patchDrupalAttribute(DrupalAttribute)
  })

  // existing `class` value → result of `.addClass('added')`, via getClasses()
  const addCases: Array<{
    name: string
    make: () => DrupalAttribute
    expected: unknown[]
  }> = [
    {
      name: 'undefined (no class set)',
      make: () => new DrupalAttribute(),
      expected: ['added'],
    },
    {
      name: 'empty array',
      make: () => new DrupalAttribute([['class', []]]),
      expected: ['added'],
    },
    {
      name: 'array',
      make: () => new DrupalAttribute([['class', ['x']]]),
      expected: ['x', 'added'],
    },
    {
      name: 'string',
      make: () => new DrupalAttribute([['class', 'x']]),
      expected: ['x', 'added'],
    },
    {
      name: 'empty string',
      make: () => new DrupalAttribute([['class', '']]),
      expected: ['added'],
    },
    {
      name: 'Twing Map list',
      make: () =>
        withClass(
          new Map([
            [0, 'x'],
            [1, 'y'],
          ])
        ),
      expected: ['x', 'y', 'added'],
    },
    {
      name: 'empty Map',
      make: () => withClass(new Map()),
      expected: ['added'],
    },
  ]

  test.each(addCases)(
    'addClass normalizes existing class: $name',
    ({ make, expected }) => {
      const attr = make()
      expect(() => attr.addClass('added')).not.toThrow()
      expect(attr.getClasses()).toEqual(expected)
    }
  )

  test('addClass tolerates a scalar (number) existing class', () => {
    const attr = withClass(5)
    expect(() => attr.addClass('added')).not.toThrow()
    // drupal-attribute String()-casts each entry on render.
    expect(attr.toString()).toContain('class="5 added"')
  })

  test('hasClass works when existing class is a Map or string', () => {
    const fromMap = withClass(new Map([[0, 'x']]))
    expect(fromMap.hasClass('x')).toBe(true)
    const fromString = new DrupalAttribute([['class', 'x']])
    expect(fromString.hasClass('x')).toBe(true)
  })

  test('removeClass works when existing class is a Map', () => {
    const fromMap = withClass(
      new Map([
        [0, 'x'],
        [1, 'y'],
      ])
    )
    expect(() => fromMap.removeClass('x')).not.toThrow()
    expect(fromMap.getClasses()).toEqual(['y'])
  })

  test('does not reallocate an existing array (happy path)', () => {
    const original = ['x']
    const attr = new DrupalAttribute([['class', original]])
    attr.addClass('added')
    // normalize() returns early for arrays — the same reference is mutated.
    expect(attr.getClasses()).toBe(original)
    expect(original).toEqual(['x', 'added'])
  })

  test('is idempotent — patching twice does not double-wrap', () => {
    expect(() => patchDrupalAttribute(DrupalAttribute)).not.toThrow()
    const attr = withClass(new Map([[0, 'x']]))
    attr.addClass('added')
    expect(attr.getClasses()).toEqual(['x', 'added'])
  })

  // A class built inside the template (a Twing Map), the original crash.
  test('renders create_attribute({class:[...]}).addClass(...) without throwing', () => {
    const { createSynchronousEnvironment, createSynchronousArrayLoader } = twing
    const loader = createSynchronousArrayLoader({
      t: "{{ create_attribute({class: ['a', 'b']}).addClass('c') }}",
    })
    const env = createSynchronousEnvironment(loader)
    addDrupalExtensions(env)
    let out = ''
    expect(() => {
      out = env.render('t', {})
    }).not.toThrow()
    expect(out).toContain('class="a b c"')
  })
})
