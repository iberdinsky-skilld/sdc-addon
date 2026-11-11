import assert from 'node:assert/strict'
import { describe, expect, test } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createSdcTwigRuntimeHooks } from '../vite/sdcTwigRuntime.ts'
import {
  injectTwingEnvAliases,
  twingEnvAliases,
} from '../vite/twingSharedEnv.ts'
import type { TwingNamespaceRoots } from '../generate/namespaces.ts'

// The lines vite-plugin-twing-drupal >= 1.1.4 emits for `virtual:twing-env`
// that the addon anchors on.
const sharedEnvModule = (root: string) => `
    const t0 = "<div>badge</div>";
    const allSources = {
      'badge/badge.twig': t0,
      'components/badge/badge.twig': t0
    };
    const twingNamespaces = {
      'umami': ${JSON.stringify([join(root, 'components')])}
    };
    const loader = createSDCLoader(allSources, twingNamespaces);
    const env = createSynchronousEnvironment(loader);
    addDrupalExtensions(env);
    export { env };
`

const namespacesOf = (root: string): TwingNamespaceRoots => ({
  entries: () => [['umami', root]],
  toTwingNamespaces: () => ({ umami: [join(root, 'components')] }),
})

describe('twing shared environment (plugin >= 1.1.4)', () => {
  test('twingEnvAliases pairs every template file with its template-dir key', () => {
    const root = mkdtempSync(join(tmpdir(), 'sdc-twing-'))
    try {
      mkdirSync(join(root, 'components', 'badge', 'icons'), { recursive: true })
      writeFileSync(join(root, 'components', 'badge', 'badge.twig'), 'b')
      writeFileSync(
        join(root, 'components', 'badge', 'icons', 'knife.svg'),
        's'
      )
      writeFileSync(join(root, 'components', 'badge', 'badge.css'), '')
      expect(twingEnvAliases(namespacesOf(root)).sort()).toEqual([
        [join(root, 'components', 'badge', 'badge.twig'), 'badge/badge.twig'],
        [
          join(root, 'components', 'badge', 'icons', 'knife.svg'),
          'badge/icons/knife.svg',
        ],
      ])
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  test('aliases are injected before the loader is created, guarded', () => {
    const root = mkdtempSync(join(tmpdir(), 'sdc-twing-'))
    try {
      mkdirSync(join(root, 'components', 'badge'), { recursive: true })
      writeFileSync(join(root, 'components', 'badge', 'badge.twig'), 'b')
      const out = injectTwingEnvAliases(
        sharedEnvModule(root),
        namespacesOf(root)
      )
      const abs = join(root, 'components', 'badge', 'badge.twig')
      expect(out).toContain(JSON.stringify([[abs, 'badge/badge.twig']]))
      expect(out).toContain(
        'if (!(abs in allSources) && rel in allSources) allSources[abs] = allSources[rel];'
      )
      expect(out.indexOf('allSources[abs] = allSources[rel]')).toBeLessThan(
        out.indexOf(
          'const loader = createSDCLoader(allSources, twingNamespaces);'
        )
      )
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  test('a module without the loader line is left untouched', () => {
    const root = mkdtempSync(join(tmpdir(), 'sdc-twing-'))
    try {
      expect(
        injectTwingEnvAliases('export const x = 1', namespacesOf(root))
      ).toBe('export const x = 1')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  test('the plugin transform handles virtual:twing-env and registers the runtime once', () => {
    const root = mkdtempSync(join(tmpdir(), 'sdc-twing-'))
    try {
      mkdirSync(join(root, 'components', 'badge'), { recursive: true })
      writeFileSync(join(root, 'components', 'badge', 'badge.twig'), 'b')
      const plugin = createSdcTwigRuntimeHooks(namespacesOf(root))
      const first = plugin.transform(sharedEnvModule(root), 'virtual:twing-env')
      assert(first)
      expect(first.code).toContain(
        "import { registerSdcRuntime as _sdcRegisterRuntime } from 'virtual:sdc-twig-runtime:twing'"
      )
      expect(first.code).toContain(
        'addDrupalExtensions(env);\n_sdcRegisterRuntime(env);'
      )
      expect(first.code).toContain('allSources[abs] = allSources[rel]')
      // Already-injected code is not touched again.
      expect(plugin.transform(first.code, 'virtual:twing-env')).toBeNull()
      // Unrelated modules are ignored.
      expect(plugin.transform('export default 1', '/x/y.js')).toBeNull()
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
