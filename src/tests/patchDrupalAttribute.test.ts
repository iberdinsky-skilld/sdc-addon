import { describe, expect, test, beforeAll } from 'vitest'
import DrupalAttribute from 'drupal-attribute'
import twing from 'twing'
// @ts-ignore — @christianwiedemann/drupal-twig-extensions ships no types
import { addDrupalExtensions } from '@christianwiedemann/drupal-twig-extensions/twing'
import { patchDrupalAttribute } from '../renderer/attributes.ts'

describe('patchDrupalAttribute', () => {
  beforeAll(() => {
    // Apply the shipped patch to the real DrupalAttribute singleton (the same
    // class create_attribute() and the component render use).
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
        new DrupalAttribute([
          [
            'class',
            new Map([
              [0, 'x'],
              [1, 'y'],
            ]) as never,
          ],
        ]),
      expected: ['x', 'y', 'added'],
    },
    {
      name: 'empty Map',
      make: () => new DrupalAttribute([['class', new Map() as never]]),
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
    const attr = new DrupalAttribute([['class', 5 as never]])
    expect(() => attr.addClass('added')).not.toThrow()
    // drupal-attribute String()-casts each entry on render.
    expect(attr.toString()).toContain('class="5 added"')
  })

  test('hasClass works when existing class is a Map or string', () => {
    const fromMap = new DrupalAttribute([
      ['class', new Map([[0, 'x']]) as never],
    ])
    expect(fromMap.hasClass('x')).toBe(true)
    const fromString = new DrupalAttribute([['class', 'x']])
    expect(fromString.hasClass('x')).toBe(true)
  })

  test('removeClass works when existing class is a Map', () => {
    const fromMap = new DrupalAttribute([
      [
        'class',
        new Map([
          [0, 'x'],
          [1, 'y'],
        ]) as never,
      ],
    ])
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
    const attr = new DrupalAttribute([['class', new Map([[0, 'x']]) as never]])
    attr.addClass('added')
    expect(attr.getClasses()).toEqual(['x', 'added'])
  })

  // Integration: a template that addClasses a class built inside the template
  // (where Twing stores it as a Map) — the original crash repro.
  test('renders create_attribute({class:[...]}).addClass(...) without throwing', () => {
    const { createSynchronousEnvironment, createSynchronousArrayLoader } =
      twing as unknown as {
        createSynchronousEnvironment: (loader: unknown) => {
          render: (name: string, ctx: unknown) => string
        }
        createSynchronousArrayLoader: (
          templates: Record<string, string>
        ) => unknown
      }
    const loader = createSynchronousArrayLoader({
      t: "{{ create_attribute({class: ['a', 'b']}).addClass('c') }}",
    })
    const env = createSynchronousEnvironment(loader)
    addDrupalExtensions(env as never)
    let out = ''
    expect(() => {
      out = env.render('t', {})
    }).not.toThrow()
    expect(out).toContain('class="a b c"')
  })
})
