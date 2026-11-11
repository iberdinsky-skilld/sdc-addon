// Context for an icon template, shared by icon() and `type: icon` nodes.
import DrupalAttribute from 'drupal-attribute'
import type { IconPack } from '../sdc.d.ts'
import { toPlainObject } from './collections.ts'

export function buildIconContext(
  pack: IconPack,
  iconId: string,
  settings: unknown
): Record<string, unknown> {
  const settingsObj = toPlainObject(settings) ?? {}
  const resolved: Record<string, unknown> = {}
  for (const [key, def] of Object.entries(pack.settings)) {
    resolved[key] = Object.prototype.hasOwnProperty.call(settingsObj, key)
      ? settingsObj[key]
      : (def.default ?? '')
  }

  let source = ''
  let content = ''
  let svgAttrs: Record<string, string> = {}
  let group = ''

  if (pack.extractor === 'svg_sprite') {
    source = pack.sourceUrls[0] ?? ''
  } else if (pack.extractor === 'svg') {
    const svgData = pack.svgIcons[iconId]
    if (svgData) {
      source = svgData.sourceUrl
      content = svgData.content
      svgAttrs = svgData.attrs
      group = svgData.group
    }
  } else {
    const pathData = pack.pathIcons[iconId]
    const base = pack.sourceUrls[0]
    if (pathData) {
      source = pathData.sourceUrl
      group = pathData.group
    } else if (base) {
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
