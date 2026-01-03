import { describe, expect, test } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  toNamespaces,
  resolveComponentPath,
  getProjectName,
} from '../namespaces.ts'

describe('Namespaces - pathToNamespace (integration)', () => {
  test('produces expected namespace strings for component paths', () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-test-'))
    try {
      const dsARoot = join(tmpRoot, 'ds-a')
      const dsBRoot = join(tmpRoot, 'ds-b')
      const dsC = join(dsBRoot, 'ds-c')

      // Create components folders that Namespaces expects to exist on disk
      mkdirSync(join(dsARoot, 'components', 'component-a'), { recursive: true })
      mkdirSync(join(dsC, 'components', 'component-a'), { recursive: true })
      mkdirSync(join(dsBRoot, 'components', 'component-a', 'sub-component-b'), {
        recursive: true,
      })

      const namespaces = toNamespaces({
        namespace: '',
        namespaces: {
          'ds-a': dsARoot,
          'ds-c': dsC,
          'ds-b': dsBRoot,
        },
      })

      const p1 = join(dsARoot, 'components', 'component-a')
      const p2 = join(dsBRoot, 'ds-c', 'components', 'component-a')
      const p3 = join(dsBRoot, 'components', 'component-a', 'sub-component-b')

      expect(namespaces.pathToNamespace(p1)).toBe('@ds-a/component-a')
      expect(namespaces.pathToNamespace(p2)).toBe('@ds-c/component-a')
      expect(namespaces.pathToNamespace(p3)).toBe(
        '@ds-b/component-a/sub-component-b'
      )
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('Namespaces - utilities (unit/integration)', () => {
  test('getProjectName returns parent folder before components', () => {
    const p = join('/root', 'ds-a', 'components', 'component-a')
    expect(getProjectName(p)).toBe('ds-a')
  })

  test('getProjectName throws when components missing', () => {
    expect(() => getProjectName('/no/other/here')).toThrow()
  })

  test('toViteAlias / toTwingNamespaces / toTwigJsNamespaces behavior', () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-ns-'))
    try {
      const pkg1 = join(tmpRoot, 'pkg1')
      const pkg2 = join(tmpRoot, 'pkg2')
      mkdirSync(join(pkg1, 'components', 'foo'), { recursive: true })
      mkdirSync(pkg2, { recursive: true })

      const ns = toNamespaces({
        namespace: '',
        namespaces: {
          pkg1: pkg1,
          pkg2: pkg2,
        },
      })

      const aliases = ns.toViteAlias()
      // pkg1 has components folder -> replacement should reference components
      expect(aliases.find((a) => a.find === '@pkg1')?.replacement).toContain(
        '/components'
      )
      // pkg2 has no components folder -> replacement should reference the root
      expect(aliases.find((a) => a.find === '@pkg2')?.replacement).toContain(
        'pkg2'
      )

      const twing = ns.toTwingNamespaces()
      expect(twing['pkg1'][0]).toContain('/components')

      const twigjs = ns.toTwigJsNamespaces()
      expect(twigjs['pkg2']).toBeDefined()
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('resolveComponentPath finds direct and nested components', () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-res-'))
    try {
      const base = join(tmpRoot, 'site')
      const componentsDir = join(base, 'components')
      const compA = join(componentsDir, 'component-a')
      const compB = join(componentsDir, 'nested', 'deep', 'component-b')
      mkdirSync(compA, { recursive: true })
      mkdirSync(compB, { recursive: true })

      const fileA = join(compA, 'component-a.component.yml')
      const fileB = join(compB, 'component-b.component.yml')
      writeFileSync(fileA, 'name: A')
      writeFileSync(fileB, 'name: B')

      const ns = toNamespaces({
        namespace: '',
        namespaces: { site: base },
      })

      const pA = resolveComponentPath('site', 'component-a', ns)
      const pB = resolveComponentPath('site', 'component-b', ns)
      const pMissing = resolveComponentPath('site', 'nope', ns)

      expect(pA).toBeDefined()
      expect(pA).toContain('component-a.component.yml')
      expect(pB).toBeDefined()
      expect(pB).toContain('component-b.component.yml')
      expect(pMissing).toBeUndefined()
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })
})
