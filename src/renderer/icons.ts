// Build the render context for an icon node (type: icon), the same way the
// icon() Twig function does.
import DrupalAttribute from 'drupal-attribute'
import type { IconPack } from '../sdc.d.ts'

export function buildIconContext(
  pack: IconPack,
  iconId: string,
  settings: unknown
): Record<string, unknown> {
  const settingsObj: Record<string, unknown> =
    settings instanceof Map
      ? Object.fromEntries(settings)
      : ((settings as Record<string, unknown>) ?? {})
  const resolved: Record<string, unknown> = {}
  const packSettings = pack.settings || {}
  for (const key of Object.keys(packSettings)) {
    const def = packSettings[key]
    resolved[key] = Object.prototype.hasOwnProperty.call(settingsObj, key)
      ? settingsObj[key]
      : def && def.default !== undefined
        ? def.default
        : ''
  }

  let source = ''
  let content = ''
  let svgAttrs: Record<string, string> = {}
  let group = ''

  if (pack.extractor === 'svg_sprite') {
    source = pack.sourceUrls && pack.sourceUrls[0] ? pack.sourceUrls[0] : ''
  } else if (pack.extractor === 'svg') {
    const svgData = pack.svgIcons && pack.svgIcons[iconId]
    if (svgData) {
      source = svgData.sourceUrl || ''
      content = svgData.content || ''
      svgAttrs = svgData.attrs || {}
      group = svgData.group || ''
    }
  } else {
    const pathData = pack.pathIcons && pack.pathIcons[iconId]
    if (pathData) {
      source = pathData.sourceUrl || ''
      group = pathData.group || ''
    } else if (pack.sourceUrls && pack.sourceUrls[0]) {
      const base = pack.sourceUrls[0]
      source =
        base.indexOf('{icon_id}') !== -1
          ? base.replace(/\{icon_id\}/g, iconId)
          : base + '/' + iconId
    }
  }

  const attributes = new DrupalAttribute(Object.entries(svgAttrs))

  return Object.assign(
    { icon_id: iconId, source, content, attributes, group },
    resolved
  )
}
