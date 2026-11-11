import { afterEach, describe, expect, test, vi } from 'vitest'
import { assetInjectorModule } from '../vite/assetInjector.ts'

// Evaluate the browser-side injector against a minimal fake document.
const loadInjector = async () =>
  (await import(
    'data:text/javascript,' + encodeURIComponent(assetInjectorModule)
  )) as { injectAssets: (assets: unknown[]) => Promise<void> }

// What injectAssets touches; src, href, media, async and onload are assigned
// as plain properties.
interface FakeElement {
  tag: string
  attrs: Record<string, string>
  setAttribute(k: string, v: string): void
  onload?: () => void
  [prop: string]: unknown
}

const fakeDocument = () => {
  const created: FakeElement[] = []
  const doc = {
    querySelector: () => null,
    createElement: (tag: string): FakeElement => {
      const attrs: Record<string, string> = {}
      const el: FakeElement = {
        tag,
        attrs,
        setAttribute: (k, v) => {
          attrs[k] = v
        },
      }
      created.push(el)
      return el
    },
    head: {
      appendChild: (el: FakeElement) => {
        // Simulate the network finishing in reverse order.
        setTimeout(() => el.onload?.(), created.length === 1 ? 20 : 1)
      },
    },
  }
  return { doc, created }
}

describe('injectAssets', () => {
  afterEach(() => vi.unstubAllGlobals())

  test('scripts are inserted in order with async off, so they execute in order', async () => {
    const { doc, created } = fakeDocument()
    vi.stubGlobal('document', doc)
    const { injectAssets } = await loadInjector()
    await injectAssets([
      { type: 'js', url: 'https://cdn/jquery.js' },
      {
        type: 'js',
        url: 'https://cdn/jquery-ui.js',
        attributes: { defer: true },
      },
      { type: 'css', url: 'https://cdn/ui.css', media: 'print' },
    ])
    const scripts = created.filter((e) => e.tag === 'script')
    expect(scripts.map((s) => s.src)).toEqual([
      'https://cdn/jquery.js',
      'https://cdn/jquery-ui.js',
    ])
    expect(scripts.every((s) => s.async === false)).toBe(true)
    expect(scripts[1]?.attrs['defer']).toBe('')
    const link = created.find((e) => e.tag === 'link')
    expect(link?.['href']).toBe('https://cdn/ui.css')
    expect(link?.['media']).toBe('print')
  })

  test('is a no-op without a document', async () => {
    vi.stubGlobal('document', undefined)
    const { injectAssets } = await loadInjector()
    await expect(
      injectAssets([{ type: 'js', url: 'x' }])
    ).resolves.toBeUndefined()
  })
})
