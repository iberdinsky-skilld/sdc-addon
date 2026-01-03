import { describe, expect, test } from 'vitest'
import type { Component } from '../sdc.d.ts'
import generate from '../storiesGenerator'

describe('storiesGenerator', () => {
  test('generates export with capitalized key, description, props, slots and variants', () => {
    const stories: Record<
      string,
      Partial<Component> & {
        props?: Record<string, any>
        slots?: Record<string, any>
        variants?: Record<string, { title: string }>
      }
    > = {
      basic: {
        component: 'my-component',
        props: { title: 'Hello' },
        slots: { default: { type: 'markup', markup: '<span>slot</span>' } },
        variants: { small: { title: 'Small' } },
        description: 'A basic story',
      },
    }

    const out = generate(stories as unknown as Component[])

    expect(out).toContain('export const Basic')
    expect(out).toContain('A basic story')
    expect(out).toContain('title: "Hello"')
    expect(out).toContain('small: "Small"')
    // slot markup should be rendered into the args
    expect(out).toContain('<span>slot</span>')
  })

  test('converts props.attributes into defaultAttributes array', () => {
    const stories: Record<
      string,
      Partial<Component> & { props?: Record<string, any> }
    > = {
      withAttrs: {
        component: 'my-component',
        props: { attributes: { class: 'a', id: 'x' }, title: 'T' },
        description: 'attrs story',
      },
    }

    const out = generate(stories as unknown as Component[])

    expect(out).toContain('defaultAttributes')
    expect(out).toContain('[\'class\', "a"]')
    expect(out).toContain('[\'id\', "x"]')
  })

  test('includes library_wrapper as decorator when provided', () => {
    const wrapper = '<div class="wrap">{{ _story }}</div>'
    const stories: Record<
      string,
      Partial<Component> & { props?: Record<string, any> }
    > = {
      wrapped: {
        component: 'my-component',
        props: { title: 'W' },
        library_wrapper: wrapper,
        description: 'wrapped story',
      },
    }

    const out = generate(stories as unknown as Component[])

    expect(out).toContain('decorators')
    // JSON.stringify wraps and escapes quotes; assert the placeholder exists instead
    expect(out).toContain('{{ _story }}')
    // ensure the placeholder replacement code is present
    expect(out).toContain("wrapper.replace('{{ _story }}', Story())")
  })

  test('renders complex variants with multiple keys and special titles', () => {
    const stories: Record<
      string,
      Partial<Component> & { variants?: Record<string, { title: string }> }
    > = {
      complex: {
        component: 'my-component',
        props: { title: 'C' },
        variants: {
          alpha: { title: 'Alpha Title' },
          'beta-1': { title: 'Beta & More' },
          '123start': { title: 'StartsWithDigits' },
        },
        description: 'complex variants',
      },
    }

    const out = generate(stories as unknown as Component[])

    // variant keys should appear with their titles
    expect(out).toContain('alpha: "Alpha Title"')
    expect(out).toContain('beta-1: "Beta & More"')
    expect(out).toContain('123start: "StartsWithDigits"')
  })
})
