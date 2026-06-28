import { describe, expect, test, vi } from 'vitest'
import { toNamespaces } from '../namespaces.ts'
import {
  sdcTwigRuntimePlugin,
  VIRTUAL_TWIG,
  VIRTUAL_TWING,
} from '../vite-plugin-sdc-twig-runtime.ts'

const RESOLVED_TWIG = '\0' + VIRTUAL_TWIG
const RESOLVED_TWING = '\0' + VIRTUAL_TWING

const makePlugin = (
  namespaces: Record<string, string> = {}
): Record<string, (arg: unknown) => unknown> =>
  sdcTwigRuntimePlugin(
    toNamespaces({ namespace: '', namespaces })
  ) as unknown as Record<string, (arg: unknown) => unknown>

describe('sdcTwigRuntimePlugin: handleHotUpdate', () => {
  test('full-reloads when a virtual runtime / icon-pack module changes', () => {
    const p = makePlugin()
    const send = vi.fn()
    const server = { ws: { send } }
    for (const id of [
      RESOLVED_TWIG,
      RESOLVED_TWING,
      '\0icons-pack:/x/y.icons.yml',
    ]) {
      send.mockClear()
      const r = p.handleHotUpdate({ modules: [{ id }], server })
      expect(send).toHaveBeenCalledWith({ type: 'full-reload' })
      expect(r).toEqual([])
    }
  })

  test('ignores unrelated module updates', () => {
    const p = makePlugin()
    const send = vi.fn()
    const r = p.handleHotUpdate({
      modules: [{ id: '/src/foo.ts' }],
      server: { ws: { send } },
    })
    expect(send).not.toHaveBeenCalled()
    expect(r).toBeUndefined()
  })
})

describe('sdcTwigRuntimePlugin: configureServer', () => {
  test('watches namespace roots and reloads on a new *.icons.yml', () => {
    const ns = toNamespaces({
      namespace: '',
      namespaces: { a: '/root/a', b: '/root/b' },
    })
    const p = sdcTwigRuntimePlugin(ns) as unknown as {
      configureServer: (server: unknown) => void
    }

    const add = vi.fn()
    let onAdd: (path: string) => void = () => {}
    const on = vi.fn((evt: string, cb: (path: string) => void) => {
      if (evt === 'add') onAdd = cb
    })
    const getModuleById = vi.fn((id: string) => ({ id }))
    const invalidateModule = vi.fn()
    const send = vi.fn()

    p.configureServer({
      watcher: { add, on },
      moduleGraph: { getModuleById, invalidateModule },
      ws: { send },
    })

    // every namespace root is watched
    for (const [, root] of ns.entries()) {
      expect(add).toHaveBeenCalledWith(root)
    }

    // a new *.icons.yml invalidates both virtual modules + full-reload
    onAdd('/root/a/theme.icons.yml')
    expect(getModuleById).toHaveBeenCalledWith(RESOLVED_TWIG)
    expect(getModuleById).toHaveBeenCalledWith(RESOLVED_TWING)
    expect(invalidateModule).toHaveBeenCalledTimes(2)
    expect(send).toHaveBeenCalledWith({ type: 'full-reload' })

    // a non-icons file does nothing
    invalidateModule.mockClear()
    send.mockClear()
    onAdd('/root/a/button.twig')
    expect(invalidateModule).not.toHaveBeenCalled()
    expect(send).not.toHaveBeenCalled()
  })
})
