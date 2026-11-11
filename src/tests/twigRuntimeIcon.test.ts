import { afterEach, describe, expect, test, vi } from 'vitest'
import Twig from 'twig'
import { createTwigRuntime } from '../renderer/twig.ts'
import type { IconPacks } from '../sdc.d.ts'

const packs: IconPacks = {
  ok: {
    packId: 'ok',
    label: 'ok',
    extractor: 'path',
    sources: ['icons'],
    sourceUrls: ['sdc-icons/t/icons'],
    settings: {},
    template: '<img src="{{ source }}" alt="{{ icon_id }}">',
    svgIcons: {},
    pathIcons: {},
  },
  broken: {
    packId: 'broken',
    label: 'broken',
    extractor: 'path',
    sources: ['icons'],
    sourceUrls: ['sdc-icons/t/icons'],
    settings: {},
    // twig.js swallows compile errors; an unknown filter throws at render time.
    template: '{{ icon_id|no_such_filter }}',
    svgIcons: {},
    pathIcons: {},
  },
}

describe('twig.js icon() and renderIcon share one renderer', () => {
  afterEach(() => vi.restoreAllMocks())

  test('a working pack renders the same through icon() and renderIcon()', () => {
    const rt = createTwigRuntime(packs)
    rt.registerSdcRuntime(Twig)
    const viaFunction = Twig.twig({ data: "{{ icon('ok', 'home') }}" }).render(
      {}
    )
    expect(viaFunction).toBe('<img src="sdc-icons/t/icons/home" alt="home">')
    expect(rt.renderIcon('ok', 'home', {})).toBe(viaFunction)
  })

  test('a broken pack template logs the error and renders nothing, in both paths', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const rt = createTwigRuntime(packs)
    rt.registerSdcRuntime(Twig)
    expect(Twig.twig({ data: "{{ icon('broken', 'home') }}" }).render({})).toBe(
      ''
    )
    expect(rt.renderIcon('broken', 'home', {})).toBe('')
    // twig.js logs its own compile error too; count only the addon's lines.
    const ours = errorSpy.mock.calls.filter((call) =>
      String(call[0]).includes('broken:home')
    )
    expect(ours).toHaveLength(2)
  })

  test('unknown pack or missing icon id render nothing without logging', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const rt = createTwigRuntime(packs)
    rt.registerSdcRuntime(Twig)
    expect(rt.renderIcon('nope', 'home', {})).toBe('')
    expect(rt.renderIcon('ok', '', {})).toBe('')
    expect(errorSpy).not.toHaveBeenCalled()
  })
})
