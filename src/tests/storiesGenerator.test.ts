import { describe, expect, test } from 'vitest'
import type { Component } from '../sdc.d.ts'
import generate from '../generate/stories'

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
      example: {
        component: 'my-component',
        props: { title: 'Hello' },
        slots: { default: { type: 'markup', markup: '<span>slot</span>' } },
        variants: { small: { title: 'Small' } },
        description: 'An example story',
      },
    }

    const out = generate(stories as unknown as Component[])

    expect(out).toContain('export const Example')
    expect(out).toContain('An example story')
    expect(out).toContain('title: "Hello"')
    expect(out).toContain('small: "Small"')
    // slot markup should be rendered into the args
    expect(out).toContain('<span>slot</span>')
  })

  test('adds Variant_ prefix when story key capitalizes to "Basic"', () => {
    const stories: Record<
      string,
      Partial<Component> & {
        props?: Record<string, any>
      }
    > = {
      basic: {
        component: 'my-component',
        props: { title: 'Basic variant' },
        description: 'Basic variant story',
      },
    }

    const out = generate(stories as unknown as Component[])

    // Should prefix with Variant_ to avoid conflict with auto-generated Basic story
    expect(out).toContain('export const Variant_Basic')
    expect(out).not.toContain('export const Basic')
    expect(out).toContain('Basic variant story')
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

  test('library_wrapper stories emit a static render, no browser decorator', () => {
    const stories: Record<string, Partial<Component>> = {
      wrapped: {
        component: 'my-component',
        library_wrapper: '<div class="wrap">{{ _story }}</div>',
      },
    }
    const out = generate(stories as unknown as Component[])
    expect(out).toContain('render: () =>')
    expect(out).not.toContain('decorators')
    expect(out).not.toContain('_sdcMakeStory')
  })

  test('uses the pre-rendered wrapper HTML when provided', () => {
    const stories: Record<string, Partial<Component>> = {
      wrapped: {
        component: 'my-component',
        library_wrapper: '<div>{{ _story }}</div>',
      },
    }
    const out = generate(stories as unknown as Component[], {}, 'ns:c', {
      wrapped: '<div class="wrap">RENDERED</div>',
    })
    expect(out).toContain(
      'render: () => "<div class=\\"wrap\\">RENDERED</div>"'
    )
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

  test('adds globals and merges with component globals', () => {
    const stories: Record<string, Partial<Component>> = {
      withGlobals: {
        component: 'my-component',
        description: 'globals story',
        globals: { theme: 'dark' },
      },
    }

    const out = generate(stories as unknown as Component[], {
      locale: 'en',
    })

    expect(out).toContain('globals:')
    expect(out).toContain('"locale": "en"')
    expect(out).toContain('"theme": "dark"')
  })
})
