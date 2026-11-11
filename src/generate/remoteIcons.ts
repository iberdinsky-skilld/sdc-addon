// CDN icons, fetched at build time and inlined.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { isRemoteUrl, listDir } from '../utils.ts'
import {
  collectIconIdsFromData,
  fetchRemoteSprite,
  fetchRemoteSvgIcons,
} from './iconPacks.ts'
import type { NamespaceRoots } from './namespaces.ts'
import type { IconPacks } from '../sdc.d.ts'

const remoteSvgCache = new Map<string, string | null>()

async function fetchSvgFromUrl(url: string): Promise<string | null> {
  if (remoteSvgCache.has(url)) return remoteSvgCache.get(url) ?? null
  try {
    const res = await fetch(url)
    if (!res.ok) {
      remoteSvgCache.set(url, null)
      return null
    }
    const text = await res.text()
    remoteSvgCache.set(url, text)
    return text
  } catch {
    remoteSvgCache.set(url, null)
    return null
  }
}

// Parsed *.component.yml and *.story.yml of every namespace.
export function readNamespaceYamlData(namespaces: NamespaceRoots): unknown[] {
  const out: unknown[] = []
  for (const [, root] of namespaces.entries()) {
    for (const entry of listDir(join(root, 'components'))) {
      if (entry.isDirectory) continue
      if (
        !entry.name.endsWith('.story.yml') &&
        !entry.name.endsWith('.component.yml')
      )
        continue
      try {
        out.push(parseYaml(readFileSync(entry.path, 'utf8')))
      } catch {
        /* skip unparseable */
      }
    }
  }
  return out
}

// Fills remote svg packs with the referenced icons; returns remote sprites by
// pack id.
export async function inlineRemoteIcons(
  packs: IconPacks,
  namespaces: NamespaceRoots
): Promise<Record<string, string>> {
  // Only the icons the YAML references.
  const remotePacks = Object.values(packs).filter(
    (p) => p.extractor === 'svg' && p.sources.some((s) => isRemoteUrl(s))
  )
  if (remotePacks.length > 0) {
    const yamlData = readNamespaceYamlData(namespaces)
    for (const pack of remotePacks) {
      const used = new Set<string>()
      for (const data of yamlData) {
        collectIconIdsFromData(data, pack.packId, used)
      }
      await fetchRemoteSvgIcons(pack, used, fetchSvgFromUrl)
    }
  }

  // Browsers block external `<use href>`, so sprites are inlined.
  const sprites: Record<string, string> = {}
  for (const pack of Object.values(packs)) {
    if (
      pack.extractor === 'svg_sprite' &&
      pack.sources.some((s) => isRemoteUrl(s))
    ) {
      const content = await fetchRemoteSprite(pack, fetchSvgFromUrl)
      if (content) sprites[pack.packId] = content
    }
  }
  return sprites
}
