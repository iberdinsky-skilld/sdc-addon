import { describe, expect, test } from 'vitest'
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { listDir, posixDirname } from '../utils.ts'
import { collectStoryFilesSync } from '../generate/componentFiles.ts'
import { readNamespaceYamlData } from '../generate/remoteIcons.ts'
import { collectTemplates } from '../generate/wrapperBuild.ts'
import type { NamespaceRoots } from '../generate/namespaces.ts'

// Only `entries()` is needed; a real Namespaces also adds the cwd.
const namespacesOf = (map: Record<string, string>): NamespaceRoots => ({
  entries: () => Object.entries(map),
})

const tmp = () => mkdtempSync(join(tmpdir(), 'sdc-walk-'))
const touch = (p: string, content = '') => {
  mkdirSync(join(p, '..'), { recursive: true })
  writeFileSync(p, content)
}

describe('listDir', () => {
  test('lists files and directories recursively with posix relative paths', () => {
    const root = tmp()
    try {
      touch(join(root, 'a.txt'))
      touch(join(root, 'sub', 'deep', 'b.txt'))
      touch(join(root, 'sub', 'c.txt'))
      const listed = listDir(root)
        .map((e) => `${e.relative}${e.isDirectory ? '/' : ''}|${e.name}`)
        .sort()
      expect(listed).toEqual(
        [
          'a.txt|a.txt',
          'sub/|sub',
          'sub/c.txt|c.txt',
          'sub/deep/|deep',
          'sub/deep/b.txt|b.txt',
        ].sort()
      )
      expect(listDir(root).every((e) => e.path.startsWith(root))).toBe(true)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  test('a missing root yields an empty list without throwing', () => {
    expect(listDir('/definitely/not/here')).toEqual([])
  })

  test('an unreadable subdirectory makes the whole listing empty, not an error', () => {
    if (process.getuid?.() === 0) return // root ignores permissions
    const root = tmp()
    const locked = join(root, 'locked')
    try {
      touch(join(root, 'ok.txt'))
      touch(join(locked, 'hidden.txt'))
      chmodSync(locked, 0o000)
      expect(() => listDir(root)).not.toThrow()
      expect(listDir(root)).toEqual([])
    } finally {
      chmodSync(locked, 0o755)
      rmSync(root, { recursive: true, force: true })
    }
  })

  test('posixDirname returns the directory part or an empty string', () => {
    expect(posixDirname('a/b/c.svg')).toBe('a/b')
    expect(posixDirname('c.svg')).toBe('')
  })
})

describe('collectStoryFilesSync', () => {
  test('finds story files at any depth but not inside a nested component', () => {
    const root = tmp()
    try {
      const comp = join(root, 'components', 'card')
      touch(join(comp, 'card.component.yml'), 'name: Card')
      touch(join(comp, 'card.preview.story.yml'), 'name: Preview')
      touch(join(comp, 'stories', 'card.grid.story.yml'), 'name: Grid')
      touch(join(comp, 'stories', 'readme.md'))
      // A nested component owns its own stories.
      touch(join(comp, 'badge', 'badge.component.yml'), 'name: Badge')
      touch(join(comp, 'badge', 'badge.basic.story.yml'), 'name: Basic')
      const found = collectStoryFilesSync(comp)
        .map((p) => p.slice(comp.length + 1))
        .sort()
      expect(found).toEqual([
        'card.preview.story.yml',
        'stories/card.grid.story.yml',
      ])
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

describe('readNamespaceYamlData', () => {
  test('parses component and story yml under components/, skipping the rest', () => {
    const root = tmp()
    try {
      touch(join(root, 'components', 'a', 'a.component.yml'), 'name: A')
      touch(join(root, 'components', 'a', 'deep', 'a.x.story.yml'), 'name: AX')
      touch(join(root, 'components', 'a', 'a.twig'), '<div>{{ name }}</div>')
      touch(join(root, 'components', 'b', 'b.component.yml'), ': not yaml :')
      touch(join(root, 'outside.component.yml'), 'name: Outside')
      const ns = namespacesOf({ t: root })
      const names = readNamespaceYamlData(ns)
        .map((d) => (d as { name?: string }).name)
        .filter(Boolean)
        .sort()
      expect(names).toEqual(['A', 'AX'])
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  test('a namespace without components/ contributes nothing', () => {
    const root = tmp()
    try {
      const ns = namespacesOf({ t: root })
      expect(readNamespaceYamlData(ns)).toEqual([])
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

describe('collectTemplates', () => {
  test('keys twig and svg files as @ns/relative under components/', () => {
    const root = tmp()
    try {
      touch(join(root, 'components', 'card', 'card.twig'), 'card')
      touch(join(root, 'components', 'card', 'icons', 'star.svg'), '<svg/>')
      touch(join(root, 'components', 'card', 'card.css'), '.card{}')
      const ns = namespacesOf({ t: root })
      expect(collectTemplates(ns)).toEqual({
        '@t/card/card.twig': 'card',
        '@t/card/icons/star.svg': '<svg/>',
      })
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  test('falls back to the namespace root when there is no components/ dir', () => {
    const root = tmp()
    try {
      touch(join(root, 'brand', 'logo.svg'), '<svg>logo</svg>')
      const ns = namespacesOf({ assets: root })
      expect(collectTemplates(ns)).toEqual({
        '@assets/brand/logo.svg': '<svg>logo</svg>',
      })
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
