import { describe, expect, test } from 'vitest'
import type { StoryDefinition } from '../sdc.d.ts'
import generate from '../generate/stories'

describe('storiesGenerator', () => {
  test('generates export with capitalized key, description, props, slots and variants', () => {
    const stories: Record<string, StoryDefinition> = {
      example: {
        props: { title: 'Hello' },
        slots: { default: { type: 'markup', markup: '<span>slot</span>' } },
        variants: { small: { title: 'Small' } },
        description: 'An example story',
      },
    }

    const out = generate(stories)

    expect(out).toContain('export const Example')
    expect(out).toContain('An example story')
    expect(out).toContain('title: "Hello"')
    expect(out).toContain('small: "Small"')
    expect(out).toContain('<span>slot</span>')
  })

  test('adds Variant_ prefix when story key capitalizes to "Basic"', () => {
    const stories: Record<string, StoryDefinition> = {
      basic: {
        props: { title: 'Basic variant' },
        description: 'Basic variant story',
      },
    }

    const out = generate(stories)

    // 'Basic' is reserved for the generated Basic story.
    expect(out).toContain('export const Variant_Basic')
    expect(out).not.toContain('export const Basic')
    expect(out).toContain('Basic variant story')
  })

  test('converts props.attributes into defaultAttributes array', () => {
    const stories: Record<string, StoryDefinition> = {
      withAttrs: {
        props: { attributes: { class: 'a', id: 'x' }, title: 'T' },
        description: 'attrs story',
      },
    }

    const out = generate(stories)

    expect(out).toContain('defaultAttributes')
    expect(out).toContain('[\'class\', "a"]')
    expect(out).toContain('[\'id\', "x"]')
  })

  test('library_wrapper stories emit a static render, no browser decorator', () => {
    const stories: Record<string, StoryDefinition> = {
      wrapped: {
        library_wrapper: '<div class="wrap">{{ _story }}</div>',
      },
    }
    const out = generate(stories)
    expect(out).toContain('render: () =>')
    expect(out).not.toContain('decorators')
    expect(out).not.toContain('_sdcMakeStory')
  })

  test('uses the pre-rendered wrapper HTML when provided', () => {
    const stories: Record<string, StoryDefinition> = {
      wrapped: {
        library_wrapper: '<div>{{ _story }}</div>',
      },
    }
    const out = generate(
      stories,
      {},
      {
        wrapped: '<div class="wrap">RENDERED</div>',
      }
    )
    expect(out).toContain(
      'render: () => "<div class=\\"wrap\\">RENDERED</div>"'
    )
  })

  test('renders complex variants with multiple keys and special titles', () => {
    const stories: Record<string, StoryDefinition> = {
      complex: {
        props: { title: 'C' },
        variants: {
          alpha: { title: 'Alpha Title' },
          'beta-1': { title: 'Beta & More' },
          '123start': { title: 'StartsWithDigits' },
        },
        description: 'complex variants',
      },
    }

    const out = generate(stories)

    expect(out).toContain('alpha: "Alpha Title"')
    expect(out).toContain('beta-1: "Beta & More"')
    expect(out).toContain('123start: "StartsWithDigits"')
  })

  test('adds globals and merges with component globals', () => {
    const stories: Record<string, StoryDefinition> = {
      withGlobals: {
        description: 'globals story',
        globals: { theme: 'dark' },
      },
    }

    const out = generate(stories, {
      locale: 'en',
    })

    expect(out).toContain('globals:')
    expect(out).toContain('"locale": "en"')
    expect(out).toContain('"theme": "dark"')
  })
})
