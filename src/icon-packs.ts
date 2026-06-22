import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, basename, dirname, extname, relative } from 'node:path'
import { parse as parseYaml } from 'yaml'
import type { Namespaces } from './namespaces.ts'
import type {
  IconPack,
  IconPacks,
  IconPackSettings,
  SvgIconData,
  PathIconData,
  ResolveIconSource,
} from './sdc.d.ts'

export type { IconPack, IconPacks, IconPackSettings, SvgIconData, PathIconData }

interface RawIconPackDef {
  enabled?: boolean
  label?: string
  extractor?: string
  config?: { sources?: string[] }
  settings?: IconPackSettings
  template?: string
}

type RawIconsYml = Record<string, RawIconPackDef>

export interface IconPackFileResult {
  packs: IconPacks
  watchFiles: string[]
}

interface ScannedFile {
  absPath: string
  iconId: string
  group: string
}

function parseSvgFile(raw: string): {
  content: string
  attrs: Record<string, string>
} {
  const attrs: Record<string, string> = {}
  const openTagMatch = raw.match(/<svg([^>]*)>/i)
  if (openTagMatch) {
    const attrRegex = /([\w:.-]+)=(?:"([^"]*)"|'([^']*)')/g
    let m: RegExpExecArray | null
    while ((m = attrRegex.exec(openTagMatch[1])) !== null) {
      attrs[m[1]] = m[2] ?? m[3] ?? ''
    }
  }
  const innerMatch = raw.match(/<svg[^>]*>([\s\S]*)<\/svg>/i)
  const content = innerMatch ? innerMatch[1].trim() : ''
  return { content, attrs }
}

function scanDir(
  dir: string,
  baseDir: string,
  filterExt: string | null
): ScannedFile[] {
  const results: ScannedFile[] = []
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return results
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...scanDir(fullPath, baseDir, filterExt))
    } else if (entry.isFile()) {
      const ext = extname(entry.name)
      if (filterExt && ext.toLowerCase() !== filterExt.toLowerCase()) continue
      results.push({
        absPath: fullPath,
        iconId: basename(entry.name, ext),
        group: relative(baseDir, dir),
      })
    }
  }
  return results
}

function resolveSourceEntry(rawSource: string, nsRoot: string): ScannedFile[] {
  if (/^https?:\/\//.test(rawSource)) {
    return [{ absPath: rawSource, iconId: '*', group: '' }]
  }

  const absPath = resolve(nsRoot, rawSource)
  const extMatch = rawSource.match(/\*(\.[^/{}*]+)$/)
  const filterExt = extMatch ? extMatch[1] : null
  const wildcardIdx = rawSource.search(/[*{]/)
  const dirPart =
    wildcardIdx >= 0 ? rawSource.substring(0, wildcardIdx) : rawSource
  const baseDir = resolve(nsRoot, dirPart.replace(/[/\\]$/, ''))

  if (
    !rawSource.includes('*') &&
    !rawSource.includes('{') &&
    existsSync(absPath)
  ) {
    try {
      if (statSync(absPath).isFile()) {
        return [
          { absPath, iconId: basename(absPath, extname(absPath)), group: '' },
        ]
      }
    } catch {
      /* fall through */
    }
  }

  if (!existsSync(baseDir)) return []
  return scanDir(baseDir, baseDir, filterExt)
}

export function loadIconPackFile(
  iconsFilePath: string,
  resolveIconSource?: ResolveIconSource
): IconPackFileResult {
  const watchFiles: string[] = [iconsFilePath]
  const packs: IconPacks = {}

  if (!existsSync(iconsFilePath)) return { packs, watchFiles }

  const nsRoot = dirname(iconsFilePath)
  const ns = basename(iconsFilePath, '.icons.yml')

  let raw: RawIconsYml
  try {
    raw = parseYaml(readFileSync(iconsFilePath, 'utf8')) as RawIconsYml
  } catch {
    return { packs, watchFiles }
  }
  if (!raw || typeof raw !== 'object') return { packs, watchFiles }

  const toUrl = (absPath: string) =>
    `/sdc-icons/${ns}/${relative(nsRoot, absPath).replace(/\\/g, '/')}`

  for (const [packId, packDef] of Object.entries(raw)) {
    if (!packDef || typeof packDef !== 'object') continue
    if (packDef.enabled === false) continue

    const extractor = (packDef.extractor ?? 'svg') as IconPack['extractor']
    const rawSources: string[] = packDef.config?.sources ?? []
    const resolvedSources = resolveIconSource
      ? rawSources.map((src) =>
          resolveIconSource(src, { packId, namespace: ns })
        )
      : rawSources

    const sources: string[] = []
    const sourceUrls: string[] = []

    for (const src of resolvedSources) {
      if (/^https?:\/\//.test(src)) {
        sources.push(src)
        sourceUrls.push(src)
      } else {
        const absFile = resolve(nsRoot, src)
        const absBase = resolve(
          nsRoot,
          src.replace(/[*{].*$/, '').replace(/[/\\]$/, '')
        )
        const isSpriteFile =
          extractor === 'svg_sprite' &&
          existsSync(absFile) &&
          statSync(absFile).isFile()
        const finalAbs = isSpriteFile ? absFile : absBase
        sources.push(finalAbs)
        sourceUrls.push(toUrl(finalAbs))
        if (isSpriteFile) watchFiles.push(absFile)
      }
    }

    const svgIcons: Record<string, SvgIconData> = {}
    const pathIcons: Record<string, PathIconData> = {}

    if (extractor === 'svg') {
      for (const src of resolvedSources) {
        for (const file of resolveSourceEntry(src, nsRoot)) {
          if (file.iconId === '*') continue
          watchFiles.push(file.absPath)
          try {
            const { content, attrs } = parseSvgFile(
              readFileSync(file.absPath, 'utf8')
            )
            svgIcons[file.iconId] = {
              content,
              attrs,
              sourceUrl: toUrl(file.absPath),
              group: file.group,
            }
          } catch {
            /* unreadable */
          }
        }
      }
    } else if (extractor === 'path') {
      for (const src of resolvedSources) {
        for (const file of resolveSourceEntry(src, nsRoot)) {
          if (file.iconId === '*') continue
          pathIcons[file.iconId] = {
            sourceUrl: toUrl(file.absPath),
            group: file.group,
          }
        }
      }
    }

    packs[packId] = {
      packId,
      label: packDef.label ?? packId,
      extractor,
      sources,
      sourceUrls,
      settings: packDef.settings ?? {},
      template: packDef.template ?? '',
      svgIcons,
      pathIcons,
    }
  }

  return { packs, watchFiles }
}

// Walk parsed YAML (component/story) data and collect every icon_id that is
// referenced for the given pack (props `icon: {pack_id, icon_id}` and
// `type: icon` nodes both match on the pack_id/icon_id pair).
export function collectIconIdsFromData(
  data: unknown,
  packId: string,
  out: Set<string>
): void {
  if (Array.isArray(data)) {
    for (const item of data) collectIconIdsFromData(item, packId, out)
    return
  }
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    // ui-patterns icon prop / type:icon node shape.
    if (obj.pack_id === packId && typeof obj.icon_id === 'string') {
      out.add(obj.icon_id)
    }
    // Compact { pack, id } shape (e.g. the icon-api demo component).
    if (obj.pack === packId && typeof obj.id === 'string') {
      out.add(obj.id)
    }
    for (const value of Object.values(obj)) {
      collectIconIdsFromData(value, packId, out)
    }
  }
}

// For a pack whose svg sources are remote (CDN) URLs, fetch and inline the
// SVG content of only the used icons. `fetchSvg` is injectable for testing.
export async function fetchRemoteSvgIcons(
  pack: IconPack,
  usedIconIds: Iterable<string>,
  fetchSvg: (url: string) => Promise<string | null>
): Promise<void> {
  const httpSources = pack.sources.filter((s) => /^https?:\/\//.test(s))
  if (httpSources.length === 0) return
  for (const iconId of usedIconIds) {
    if (pack.svgIcons[iconId]) continue
    for (const src of httpSources) {
      const url = src.includes('{icon_id}')
        ? src.replace(/\{icon_id\}/g, iconId)
        : `${src.replace(/\/$/, '')}/${iconId}.svg`
      const raw = await fetchSvg(url)
      if (raw) {
        const { content, attrs } = parseSvgFile(raw)
        pack.svgIcons[iconId] = { content, attrs, sourceUrl: url, group: '' }
        break
      }
    }
  }
}

// For an svg_sprite pack whose source is a remote (CDN) sprite, fetch the
// sprite once. Browsers block external `<use href>`, so the caller inlines the
// sprite into the DOM and we switch the source to '' → `<use href="#icon_id">`.
export async function fetchRemoteSprite(
  pack: IconPack,
  fetchSvg: (url: string) => Promise<string | null>
): Promise<string | null> {
  if (pack.extractor !== 'svg_sprite') return null
  const remote = pack.sources.find((s) => /^https?:\/\//.test(s))
  if (!remote) return null
  const content = await fetchSvg(remote)
  if (!content) return null
  pack.sources = ['']
  pack.sourceUrls = ['']
  return content
}

export function discoverIconPacks(
  namespaces: Namespaces,
  resolveIconSource?: ResolveIconSource
): IconPacks {
  const packs: IconPacks = {}
  for (const [ns, nsRoot] of namespaces.entries()) {
    const iconsFile = join(nsRoot, `${ns}.icons.yml`)
    if (!existsSync(iconsFile)) continue
    const { packs: filePacks } = loadIconPackFile(iconsFile, resolveIconSource)
    Object.assign(packs, filePacks)
  }
  return packs
}
