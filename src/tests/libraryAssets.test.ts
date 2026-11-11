import { describe, expect, test } from 'vitest'
import type { SDCSchema } from '../sdc.d.ts'
import {
  libraryOverridesImports,
  libraryOverridesLocalImports,
} from '../generate/libraryAssets.ts'

describe('libraryOverridesImports', () => {
  test('returns empty array when no libraryOverrides', () => {
    expect(libraryOverridesImports({ name: 'Test' })).toEqual([])
  })

  test('returns empty array when libraryOverrides is empty', () => {
    expect(
      libraryOverridesImports({ name: 'Test', libraryOverrides: {} })
    ).toEqual([])
  })

  test('returns empty array when css contains only local files', () => {
    const content = {
      name: 'Test',
      libraryOverrides: { css: { component: { 'slider.css': {} } } },
    }
    expect(libraryOverridesImports(content)).toEqual([])
  })

  test('returns empty array when js contains only local files', () => {
    const content = {
      name: 'Test',
      libraryOverrides: {
        js: { 'slider.mjs': { attributes: { type: 'module' } } },
      },
    }
    expect(libraryOverridesImports(content)).toEqual([])
  })

  test('returns empty array for protocol-relative URL (not http/https)', () => {
    const content = {
      name: 'Test',
      libraryOverrides: { js: { '//cdn.example.com/lib.js': {} } },
    }
    expect(libraryOverridesImports(content)).toEqual([])
  })

  test('returns ExternalCssAsset for external CSS in base group', () => {
    const url = 'https://cdn.example.com/lib.css'
    const content = {
      name: 'Test',
      libraryOverrides: { css: { base: { [url]: { minified: true } } } },
    }
    const result = libraryOverridesImports(content)
    expect(result).toEqual([{ type: 'css', url, media: undefined }])
  })

  test('returns ExternalCssAsset with media when media is set', () => {
    const url = 'https://cdn.example.com/print.css'
    const content = {
      name: 'Test',
      libraryOverrides: { css: { base: { [url]: { media: 'print' } } } },
    }
    const result = libraryOverridesImports(content)
    expect(result).toEqual([{ type: 'css', url, media: 'print' }])
  })

  test('collects external CSS assets from all five groups', () => {
    const urls = {
      base: 'https://cdn.example.com/base.css',
      layout: 'https://cdn.example.com/layout.css',
      component: 'https://cdn.example.com/component.css',
      state: 'https://cdn.example.com/state.css',
      theme: 'https://cdn.example.com/theme.css',
    }
    const content = {
      name: 'Test',
      libraryOverrides: {
        css: Object.fromEntries(
          Object.entries(urls).map(([group, url]) => [group, { [url]: {} }])
        ),
      },
    }
    const result = libraryOverridesImports(content)
    for (const url of Object.values(urls)) {
      expect(result.some((a) => a.url === url && a.type === 'css')).toBe(true)
    }
  })

  test('returns ExternalJsAsset for external JS URL', () => {
    const url = 'https://cdn.example.com/lib.js'
    const content = {
      name: 'Test',
      libraryOverrides: { js: { [url]: {} } },
    }
    const result = libraryOverridesImports(content)
    expect(result).toEqual([{ type: 'js', url, attributes: undefined }])
  })

  test('preserves attributes on external JS', () => {
    const url = 'https://cdn.example.com/widget.js'
    const content = {
      name: 'Test',
      libraryOverrides: {
        js: {
          [url]: { attributes: { defer: true, crossorigin: 'anonymous' } },
        },
      },
    }
    const result = libraryOverridesImports(content)
    expect(result).toEqual([
      {
        type: 'js',
        url,
        attributes: { defer: true, crossorigin: 'anonymous' },
      },
    ])
  })

  test('preserves attributes on external CSS', () => {
    const url = 'https://cdn.example.com/fonts.css'
    const content = {
      name: 'Test',
      libraryOverrides: {
        css: {
          theme: {
            [url]: {
              attributes: { integrity: 'sha384-abc', crossorigin: 'anonymous' },
            },
          },
        },
      },
    }
    const result = libraryOverridesImports(content)
    expect(result).toEqual([
      {
        type: 'css',
        url,
        media: undefined,
        attributes: { integrity: 'sha384-abc', crossorigin: 'anonymous' },
      },
    ])
  })

  test('returns both CSS and JS assets when both present', () => {
    const cssUrl = 'https://cdn.example.com/style.css'
    const jsUrl = 'https://cdn.example.com/lib.js'
    const content = {
      name: 'Test',
      libraryOverrides: {
        css: { component: { [cssUrl]: {} } },
        js: { [jsUrl]: {} },
      },
    }
    const result = libraryOverridesImports(content)
    expect(result.find((a) => a.url === cssUrl)?.type).toBe('css')
    expect(result.find((a) => a.url === jsUrl)?.type).toBe('js')
  })

  test('filters out local files, keeps only external URLs', () => {
    const url1 = 'https://cdn.example.com/swiper.css'
    const url2 = 'https://cdn.example.com/scrollbar.css'
    const content = {
      name: 'Test',
      libraryOverrides: {
        css: { base: { [url1]: {}, [url2]: {}, 'local.css': {} } },
      },
    }
    const result = libraryOverridesImports(content)
    expect(result.map((a) => a.url)).toEqual([url1, url2])
  })

  test('matches real slider component libraryOverrides structure', () => {
    const content = {
      name: 'Slider',
      libraryOverrides: {
        dependencies: ['core/drupal', 'core/once'],
        js: { 'slider.mjs': { attributes: { type: 'module' } } },
        css: {
          base: {
            'https://cdn.jsdelivr.net/npm/swiper@11.1.9/swiper.min.css': {
              type: 'external',
              minified: true,
            },
            'https://cdn.jsdelivr.net/npm/swiper@11.1.9/modules/scrollbar.css':
              { type: 'external', minified: true },
            'slider.css': {},
          },
        },
      },
    }
    const result = libraryOverridesImports(content)
    // Only the two CDN stylesheets, no local files or Drupal deps.
    expect(result).toHaveLength(2)
    expect(result.every((a) => a.type === 'css')).toBe(true)
    expect(result.map((a) => a.url)).toContain(
      'https://cdn.jsdelivr.net/npm/swiper@11.1.9/swiper.min.css'
    )
    expect(result.map((a) => a.url)).toContain(
      'https://cdn.jsdelivr.net/npm/swiper@11.1.9/modules/scrollbar.css'
    )
  })

  // ----- dependencyMap -----

  test('dependencyMap maps a Drupal dependency to CDN assets', () => {
    const content = {
      name: 'Widget',
      libraryOverrides: { dependencies: ['core/drupal', 'core/jquery'] },
    }
    const result = libraryOverridesImports(content, {
      'core/jquery': [
        {
          type: 'js',
          url: 'https://cdn.jsdelivr.net/npm/jquery@3/dist/jquery.min.js',
        },
      ],
    })
    expect(result).toHaveLength(1)
    expect(result[0]?.type).toBe('js')
    expect(result[0]?.url).toContain('jquery.min.js')
  })

  test('dependencyMap assets combine with extracted CSS/JS URLs', () => {
    const cssUrl = 'https://cdn.example.com/lib.css'
    const jsUrl = 'https://cdn.example.com/extra.js'
    const content = {
      name: 'Test',
      libraryOverrides: {
        css: { base: { [cssUrl]: {} } },
        dependencies: ['some/lib'],
      },
    }
    const result = libraryOverridesImports(content, {
      'some/lib': [{ type: 'js', url: jsUrl }],
    })
    expect(result.map((a) => a.url)).toContain(cssUrl)
    expect(result.map((a) => a.url)).toContain(jsUrl)
  })

  test('unknown dependencies are silently ignored', () => {
    const content = {
      name: 'Test',
      libraryOverrides: { dependencies: ['core/drupal', 'core/once'] },
    }
    const result = libraryOverridesImports(content, {})
    expect(result).toEqual([])
  })
})

describe('libraryOverridesLocalImports', () => {
  test('returns empty when no libraryOverrides', () => {
    expect(libraryOverridesLocalImports({ name: 'Test' })).toEqual({
      css: [],
      js: [],
    })
  })

  test('collects local subfolder CSS and JS, normalized to relative paths', () => {
    const content = {
      name: 'Test',
      libraryOverrides: {
        css: { component: { 'styles/alert.css': {} } },
        js: { 'js/carousel.js': {} },
      },
    }
    expect(libraryOverridesLocalImports(content)).toEqual({
      css: [{ path: './styles/alert.css', media: undefined }],
      js: ['./js/carousel.js'],
    })
  })

  test('de-dupes root files already covered by the flat glob', () => {
    const content = {
      name: 'Test',
      libraryOverrides: {
        css: { component: { 'card.css': {} } },
        js: { 'card.js': {} },
      },
    }
    expect(libraryOverridesLocalImports(content)).toEqual({
      css: [],
      js: [],
    })
  })

  test('keeps subfolder .mjs and drops root .mjs', () => {
    const content = {
      name: 'Test',
      libraryOverrides: {
        js: { 'behaviors/widget.mjs': {}, 'widget.mjs': {} },
      },
    }
    expect(libraryOverridesLocalImports(content)).toEqual({
      css: [],
      js: ['./behaviors/widget.mjs'],
    })
  })

  test('excludes external URLs (those flow through injectAssets)', () => {
    const content = {
      name: 'Test',
      libraryOverrides: {
        css: { theme: { 'https://cdn.example.com/x.css': {} } },
        js: { 'https://cdn.example.com/x.js': {}, 'js/local.js': {} },
      },
    }
    expect(libraryOverridesLocalImports(content)).toEqual({
      css: [],
      js: ['./js/local.js'],
    })
  })

  test('de-dupes repeated declarations of the same local path', () => {
    const content = {
      name: 'Test',
      libraryOverrides: {
        css: {
          base: { 'styles/x.css': {} },
          theme: { 'styles/x.css': {} },
        },
      },
    }
    expect(libraryOverridesLocalImports(content).css).toEqual([
      { path: './styles/x.css', media: undefined },
    ])
  })

  test('skips assets disabled via `false` (Drupal semantics)', () => {
    const content: SDCSchema = {
      name: 'Test',
      libraryOverrides: {
        css: {
          component: { 'styles/keep.css': {}, 'styles/drop.css': false },
        },
        js: { 'js/keep.js': {}, 'js/drop.js': false },
      },
    }
    expect(libraryOverridesLocalImports(content)).toEqual({
      css: [{ path: './styles/keep.css', media: undefined }],
      js: ['./js/keep.js'],
    })
  })

  test('carries `media` from a CSS override entry', () => {
    const content = {
      name: 'Test',
      libraryOverrides: {
        css: { theme: { 'styles/print.css': { media: 'print' } } },
      },
    }
    expect(libraryOverridesLocalImports(content).css).toEqual([
      { path: './styles/print.css', media: 'print' },
    ])
  })
})
