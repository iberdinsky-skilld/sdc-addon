// libraryOverrides assets: external URLs are injected, local paths imported.
import { isRemoteUrl } from '../utils.ts'
import type {
  ExternalAsset,
  ExternalCssAsset,
  ExternalJsAsset,
  LibraryDefinition,
  SDCSchema,
} from '../sdc.d.ts'

const CSS_GROUPS = ['base', 'layout', 'component', 'state', 'theme'] as const

// Drupal `libraryOverrides` disables an asset when its value is `false`.
const isDisabled = (opts: unknown): opts is false => opts === false

const extractCssAssets = (library: LibraryDefinition): ExternalCssAsset[] =>
  CSS_GROUPS.flatMap((group) =>
    Object.entries(library.css?.[group] ?? {}).flatMap(
      ([url, opts]): ExternalCssAsset[] =>
        isRemoteUrl(url) && !isDisabled(opts)
          ? [
              {
                type: 'css',
                url,
                ...(opts.media ? { media: opts.media } : {}),
                ...(opts.attributes ? { attributes: opts.attributes } : {}),
              },
            ]
          : []
    )
  )

const extractJsAssets = (library: LibraryDefinition): ExternalJsAsset[] =>
  Object.entries(library.js ?? {}).flatMap(([url, opts]): ExternalJsAsset[] =>
    isRemoteUrl(url) && !isDisabled(opts)
      ? [
          {
            type: 'js',
            url,
            ...(opts.attributes ? { attributes: opts.attributes } : {}),
          },
        ]
      : []
  )

export const libraryOverridesImports = (
  content: SDCSchema,
  dependencyMap: Record<string, ExternalAsset[]> = {}
): ExternalAsset[] => {
  const overrides = content.libraryOverrides
  if (!overrides) return []
  return [
    ...extractCssAssets(overrides),
    ...extractJsAssets(overrides),
    ...(overrides.dependencies ?? []).flatMap(
      (dep) => dependencyMap[dep] ?? []
    ),
  ]
}

const normalizeLocalPath = (p: string): string =>
  p.startsWith('.') ? p : `./${p}`

// The generated module globs root `*.css` / `*.{js,mjs}` like Drupal core, so
// those overrides are skipped; subfolder paths are imported explicitly.
const isGlobCoveredCss = (p: string): boolean => /^\.\/[^/]+\.css$/.test(p)
const isGlobCoveredJs = (p: string): boolean => /^\.\/[^/]+\.(js|mjs)$/.test(p)

export interface LocalCssImport {
  path: string
  // Media-scoped CSS is injected as `<link media>` instead of bundled.
  media?: string
}

// Local libraryOverrides assets, relative to the component, de-duped against
// the root glob.
export const libraryOverridesLocalImports = (
  content: SDCSchema
): { css: LocalCssImport[]; js: string[] } => {
  const overrides = content.libraryOverrides
  if (!overrides) return { css: [], js: [] }

  const css: LocalCssImport[] = []
  const seenCss = new Set<string>()
  for (const group of CSS_GROUPS) {
    for (const [url, opts] of Object.entries(overrides.css?.[group] ?? {})) {
      if (isDisabled(opts) || isRemoteUrl(url)) continue
      const path = normalizeLocalPath(url)
      if (isGlobCoveredCss(path) || seenCss.has(path)) continue
      seenCss.add(path)
      css.push({ path, ...(opts.media ? { media: opts.media } : {}) })
    }
  }

  const js: string[] = []
  const seenJs = new Set<string>()
  for (const [url, opts] of Object.entries(overrides.js ?? {})) {
    if (isDisabled(opts) || isRemoteUrl(url)) continue
    const path = normalizeLocalPath(url)
    if (isGlobCoveredJs(path) || seenJs.has(path)) continue
    seenJs.add(path)
    js.push(path)
  }

  return { css, js }
}
