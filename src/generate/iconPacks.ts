import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve, basename, dirname, extname, relative } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { namespaceFiles, type NamespaceRoots } from './namespaces.ts'
import { isRemoteUrl, listDir, posixDirname } from '../utils.ts'
import { isRecord, isString } from '../guards.ts'
import type {
  IconPack,
  IconPacks,
  IconPackSettings,
  SvgIconData,
  PathIconData,
  ResolveIconSource,
} from '../sdc.d.ts'

export type { IconPack, IconPacks, IconPackSettings, SvgIconData, PathIconData }

// One pack of a *.icons.yml, with every field checked and defaulted.
interface IconPackDef {
  enabled: boolean
  label: string | undefined
  extractor: string
  sources: string[]
  settings: IconPackSettings
  template: string
}

const readIconPackDef = (value: unknown): IconPackDef | undefined => {
  if (!isRecord(value)) return undefined
  const { enabled, label, extractor, config, settings, template } = value
  const sources =
    isRecord(config) && Array.isArray(config['sources'])
      ? config['sources'].filter(isString)
      : []
  return {
    enabled: enabled !== false,
    label: isString(label) ? label : undefined,
    extractor: isString(extractor) ? extractor : 'svg',
    sources,
    settings: isRecord(settings)
      ? Object.fromEntries(
          Object.entries(settings).filter(
            (entry): entry is [string, Record<string, unknown>] =>
              isRecord(entry[1])
          )
        )
      : {},
    template: isString(template) ? template : '',
  }
}

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
  const openTag = /<svg([^>]*)>/i.exec(raw)?.[1] ?? ''
  for (const [, name = '', dq, sq] of openTag.matchAll(
    /([\w:.-]+)=(?:"([^"]*)"|'([^']*)')/g
  )) {
    attrs[name] = dq ?? sq ?? ''
  }
  const content = /<svg[^>]*>([\s\S]*)<\/svg>/i.exec(raw)?.[1]?.trim() ?? ''
  return { content, attrs }
}

// Every file under baseDir (optionally by extension); `group` is the file's
// directory relative to baseDir, '' at the root.
function scanDir(baseDir: string, filterExt: string | null): ScannedFile[] {
  const results: ScannedFile[] = []
  for (const entry of listDir(baseDir)) {
    if (entry.isDirectory) continue
    const ext = extname(entry.name)
    if (filterExt && ext.toLowerCase() !== filterExt.toLowerCase()) continue
    results.push({
      absPath: entry.path,
      iconId: basename(entry.name, ext),
      group: posixDirname(entry.relative),
    })
  }
  return results
}

function resolveSourceEntry(rawSource: string, nsRoot: string): ScannedFile[] {
  if (isRemoteUrl(rawSource)) {
    return [{ absPath: rawSource, iconId: '*', group: '' }]
  }

  const absPath = resolve(nsRoot, rawSource)
  const extMatch = rawSource.match(/\*(\.[^/{}*]+)$/)
  const filterExt = extMatch?.[1] ?? null
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
  return scanDir(baseDir, filterExt)
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

  let raw: unknown
  try {
    raw = parseYaml(readFileSync(iconsFilePath, 'utf8'))
  } catch {
    return { packs, watchFiles }
  }
  if (!isRecord(raw)) return { packs, watchFiles }

  // Relative, so it works when Storybook is served from a sub-path.
  const toUrl = (absPath: string) =>
    `sdc-icons/${ns}/${relative(nsRoot, absPath).replace(/\\/g, '/')}`

  for (const [packId, value] of Object.entries(raw)) {
    const packDef = readIconPackDef(value)
    if (!packDef?.enabled) continue

    const { extractor, sources: rawSources } = packDef
    const resolvedSources = resolveIconSource
      ? rawSources.map((src) =>
          resolveIconSource(src, { packId, namespace: ns })
        )
      : rawSources

    const sources: string[] = []
    const sourceUrls: string[] = []

    for (const src of resolvedSources) {
      if (isRemoteUrl(src)) {
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
      settings: packDef.settings,
      template: packDef.template,
      svgIcons,
      pathIcons,
    }
  }

  return { packs, watchFiles }
}

// Icon ids of `packId` referenced anywhere in parsed component/story YAML.
export function collectIconIdsFromData(
  data: unknown,
  packId: string,
  out: Set<string>
): void {
  if (Array.isArray(data)) {
    for (const item of data) collectIconIdsFromData(item, packId, out)
    return
  }
  if (isRecord(data)) {
    const obj = data
    // ui-patterns icon prop / type:icon node shape.
    if (obj.pack_id === packId && typeof obj.icon_id === 'string') {
      out.add(obj.icon_id)
    }
    // Compact { pack, id } shape.
    if (obj.pack === packId && typeof obj.id === 'string') {
      out.add(obj.id)
    }
    for (const value of Object.values(obj)) {
      collectIconIdsFromData(value, packId, out)
    }
  }
}

// Inlines the used icons of a pack with remote svg sources.
export async function fetchRemoteSvgIcons(
  pack: IconPack,
  usedIconIds: Iterable<string>,
  fetchSvg: (url: string) => Promise<string | null>
): Promise<void> {
  const httpSources = pack.sources.filter((s) => isRemoteUrl(s))
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

// Fetches a remote sprite once. Browsers block external `<use href>`, so the
// caller inlines it and the source becomes '' (`<use href="#id">`).
export async function fetchRemoteSprite(
  pack: IconPack,
  fetchSvg: (url: string) => Promise<string | null>
): Promise<string | null> {
  if (pack.extractor !== 'svg_sprite') return null
  const remote = pack.sources.find((s) => isRemoteUrl(s))
  if (!remote) return null
  const content = await fetchSvg(remote)
  if (!content) return null
  pack.sources = ['']
  pack.sourceUrls = ['']
  return content
}

// `<ns>.icons.yml` of every namespace that has one, as [namespace, path].
export const iconPackFiles = (
  namespaces: NamespaceRoots
): Array<[string, string]> => namespaceFiles(namespaces, 'icons')

export function discoverIconPacks(
  namespaces: NamespaceRoots,
  resolveIconSource?: ResolveIconSource
): IconPacks {
  const packs: IconPacks = {}
  for (const [, iconsFile] of iconPackFiles(namespaces)) {
    const { packs: filePacks } = loadIconPackFile(iconsFile, resolveIconSource)
    Object.assign(packs, filePacks)
  }
  return packs
}
