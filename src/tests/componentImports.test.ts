import { describe, expect, test, vi } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { toNamespaces } from '../generate/namespaces.ts'
import { logger } from '../logger.ts'
import { twigDependencyImports } from '../generate/componentImports.ts'

describe('twigDependencyImports', () => {
  test('returns empty string when twig file does not exist', () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-twig-'))
    try {
      const ns = toNamespaces({ namespace: '', namespaces: { umami: tmpRoot } })
      const result = twigDependencyImports(join(tmpRoot, 'missing.twig'), ns)
      expect(result).toBe('')
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('returns empty string when twig has no SDC includes', () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-twig-'))
    try {
      const twigFile = join(tmpRoot, 'comp.twig')
      writeFileSync(twigFile, '<div>{{ label }}</div>')
      const ns = toNamespaces({ namespace: '', namespaces: { umami: tmpRoot } })
      expect(twigDependencyImports(twigFile, ns)).toBe('')
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('ignores @namespace/path style asset references', () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-twig-'))
    try {
      const twigFile = join(tmpRoot, 'comp.twig')
      writeFileSync(twigFile, "{% include '@assets/icon.svg' %}")
      const ns = toNamespaces({ namespace: '', namespaces: { umami: tmpRoot } })
      expect(twigDependencyImports(twigFile, ns)).toBe('')
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('warns about an included component that does not exist', () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-twig-'))
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})
    try {
      const twigFile = join(tmpRoot, 'comp.twig')
      writeFileSync(twigFile, "{% include 'umami:missing' %}")
      const ns = toNamespaces({ namespace: '', namespaces: { umami: tmpRoot } })
      expect(twigDependencyImports(twigFile, ns)).toBe('')
      expect(warnSpy).toHaveBeenCalledWith(
        'Component "umami:missing" was not found'
      )
    } finally {
      warnSpy.mockRestore()
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('ignores unknown namespace:component (no resolved path)', () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-twig-'))
    try {
      const twigFile = join(tmpRoot, 'comp.twig')
      writeFileSync(twigFile, "{% include 'unknown:missing' %}")
      const ns = toNamespaces({ namespace: '', namespaces: { umami: tmpRoot } })
      expect(twigDependencyImports(twigFile, ns)).toBe('')
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('generates import for {% include "ns:component" %} (double quotes)', () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-twig-'))
    try {
      const titleDir = join(tmpRoot, 'components', 'title')
      mkdirSync(titleDir, { recursive: true })
      writeFileSync(join(titleDir, 'title.component.yml'), 'name: Title')

      const twigFile = join(tmpRoot, 'comp.twig')
      writeFileSync(twigFile, '{% include "umami:title" %}')

      const ns = toNamespaces({ namespace: '', namespaces: { umami: tmpRoot } })
      const result = twigDependencyImports(twigFile, ns)

      expect(result).toContain('title.component.yml')
      expect(result).toMatch(/^import '.*title\.component\.yml';$/m)
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('generates import for {% include %} with single quotes', () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-twig-'))
    try {
      const titleDir = join(tmpRoot, 'components', 'title')
      mkdirSync(titleDir, { recursive: true })
      writeFileSync(join(titleDir, 'title.component.yml'), 'name: Title')

      const twigFile = join(tmpRoot, 'comp.twig')
      writeFileSync(twigFile, "{% include 'umami:title' %}")

      const ns = toNamespaces({ namespace: '', namespaces: { umami: tmpRoot } })
      const result = twigDependencyImports(twigFile, ns)

      expect(result).toMatch(/^import '.*title\.component\.yml';$/m)
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('generates import for {% embed %} directive', () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-twig-'))
    try {
      const cardDir = join(tmpRoot, 'components', 'card')
      mkdirSync(cardDir, { recursive: true })
      writeFileSync(join(cardDir, 'card.component.yml'), 'name: Card')

      const twigFile = join(tmpRoot, 'comp.twig')
      writeFileSync(twigFile, "{% embed 'umami:card' %}{% endembed %}")

      const ns = toNamespaces({ namespace: '', namespaces: { umami: tmpRoot } })
      const result = twigDependencyImports(twigFile, ns)

      expect(result).toMatch(/^import '.*card\.component\.yml';$/m)
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('generates import for {% extends %} directive', () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-twig-'))
    try {
      const baseDir = join(tmpRoot, 'components', 'base-layout')
      mkdirSync(baseDir, { recursive: true })
      writeFileSync(
        join(baseDir, 'base-layout.component.yml'),
        'name: Base Layout'
      )

      const twigFile = join(tmpRoot, 'comp.twig')
      writeFileSync(twigFile, "{% extends 'umami:base-layout' %}")

      const ns = toNamespaces({ namespace: '', namespaces: { umami: tmpRoot } })
      const result = twigDependencyImports(twigFile, ns)

      expect(result).toMatch(/^import '.*base-layout\.component\.yml';$/m)
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('handles whitespace-control {%- include %} syntax', () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-twig-'))
    try {
      const titleDir = join(tmpRoot, 'components', 'title')
      mkdirSync(titleDir, { recursive: true })
      writeFileSync(join(titleDir, 'title.component.yml'), 'name: Title')

      const twigFile = join(tmpRoot, 'comp.twig')
      writeFileSync(twigFile, "{%- include 'umami:title' -%}")

      const ns = toNamespaces({ namespace: '', namespaces: { umami: tmpRoot } })
      const result = twigDependencyImports(twigFile, ns)

      expect(result).toMatch(/^import '.*title\.component\.yml';$/m)
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('handles include with with...only clause', () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-twig-'))
    try {
      const titleDir = join(tmpRoot, 'components', 'title')
      mkdirSync(titleDir, { recursive: true })
      writeFileSync(join(titleDir, 'title.component.yml'), 'name: Title')

      const twigFile = join(tmpRoot, 'comp.twig')
      writeFileSync(
        twigFile,
        "{% include 'umami:title' with { label: 'Hello' } only %}"
      )

      const ns = toNamespaces({ namespace: '', namespaces: { umami: tmpRoot } })
      const result = twigDependencyImports(twigFile, ns)

      expect(result).toMatch(/^import '.*title\.component\.yml';$/m)
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('deduplicates repeated includes of the same component', () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-twig-'))
    try {
      const titleDir = join(tmpRoot, 'components', 'title')
      mkdirSync(titleDir, { recursive: true })
      writeFileSync(join(titleDir, 'title.component.yml'), 'name: Title')

      const twigFile = join(tmpRoot, 'comp.twig')
      writeFileSync(
        twigFile,
        "{% include 'umami:title' %}\n{% include 'umami:title' %}"
      )

      const ns = toNamespaces({ namespace: '', namespaces: { umami: tmpRoot } })
      const result = twigDependencyImports(twigFile, ns)

      const lines = result.split('\n').filter(Boolean)
      expect(lines).toHaveLength(1)
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('collects multiple distinct component includes', () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-twig-'))
    try {
      const titleDir = join(tmpRoot, 'components', 'title')
      const badgeDir = join(tmpRoot, 'components', 'badge')
      mkdirSync(titleDir, { recursive: true })
      mkdirSync(badgeDir, { recursive: true })
      writeFileSync(join(titleDir, 'title.component.yml'), 'name: Title')
      writeFileSync(join(badgeDir, 'badge.component.yml'), 'name: Badge')

      const twigFile = join(tmpRoot, 'comp.twig')
      writeFileSync(
        twigFile,
        "{% include 'umami:title' %}\n{% include 'umami:badge' %}"
      )

      const ns = toNamespaces({ namespace: '', namespaces: { umami: tmpRoot } })
      const result = twigDependencyImports(twigFile, ns)

      expect(result).toContain('title.component.yml')
      expect(result).toContain('badge.component.yml')
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  // ----- namespace tests -----

  test('resolves component from a different registered namespace', () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-twig-'))
    try {
      // 'ds-a' namespace has the included component
      const dsARoot = join(tmpRoot, 'ds-a')
      const titleDir = join(dsARoot, 'components', 'title')
      mkdirSync(titleDir, { recursive: true })
      writeFileSync(join(titleDir, 'title.component.yml'), 'name: Title')

      // 'ds-b' namespace owns the parent component whose twig we parse
      const dsBRoot = join(tmpRoot, 'ds-b')
      mkdirSync(join(dsBRoot, 'components', 'paragraph'), { recursive: true })

      const twigFile = join(tmpRoot, 'paragraph.twig')
      writeFileSync(twigFile, "{% include 'ds-a:title' %}")

      const ns = toNamespaces({
        namespace: '',
        namespaces: { 'ds-a': dsARoot, 'ds-b': dsBRoot },
      })
      const result = twigDependencyImports(twigFile, ns)

      expect(result).toContain('title.component.yml')
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('resolves components from multiple different namespaces in one file', () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-twig-'))
    try {
      const dsARoot = join(tmpRoot, 'ds-a')
      const dsBRoot = join(tmpRoot, 'ds-b')

      mkdirSync(join(dsARoot, 'components', 'title'), { recursive: true })
      mkdirSync(join(dsBRoot, 'components', 'badge'), { recursive: true })
      writeFileSync(
        join(dsARoot, 'components', 'title', 'title.component.yml'),
        'name: Title'
      )
      writeFileSync(
        join(dsBRoot, 'components', 'badge', 'badge.component.yml'),
        'name: Badge'
      )

      const twigFile = join(tmpRoot, 'comp.twig')
      writeFileSync(
        twigFile,
        "{% include 'ds-a:title' %}\n{% include 'ds-b:badge' %}"
      )

      const ns = toNamespaces({
        namespace: '',
        namespaces: { 'ds-a': dsARoot, 'ds-b': dsBRoot },
      })
      const result = twigDependencyImports(twigFile, ns)

      expect(result).toContain('title.component.yml')
      expect(result).toContain('badge.component.yml')
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })

  test('resolves nested (subdirectory) component via namespace', () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'sdc-twig-'))
    try {
      const nsRoot = join(tmpRoot, 'theme')
      // component lives under components/atoms/title/
      const titleDir = join(nsRoot, 'components', 'atoms', 'title')
      mkdirSync(titleDir, { recursive: true })
      writeFileSync(join(titleDir, 'title.component.yml'), 'name: Title')

      const twigFile = join(tmpRoot, 'comp.twig')
      writeFileSync(twigFile, "{% include 'mytheme:title' %}")

      const ns = toNamespaces({
        namespace: '',
        namespaces: { mytheme: nsRoot },
      })
      const result = twigDependencyImports(twigFile, ns)

      expect(result).toContain('title.component.yml')
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true })
    }
  })
})
