// Twig.js browser runtime: env capture and icon(). The wrapper machinery lives
// in twigWrapper.ts (build-time harness only).
import type Twig from 'twig'
import DrupalAttribute from 'drupal-attribute'
import type { IconPacks } from '../sdc.d.ts'
import { buildIconContext } from './icons.ts'
import { patchDrupalAttribute } from './attributes.ts'

export { PrintableArray } from './nodes.ts'

export type TwigJs = typeof Twig & {
  filters?: Record<string, (value: unknown, params: unknown) => unknown>
  __sdcMergeOverridden?: boolean
  __sdcIconRegistered?: boolean
}

export function createTwigCore(iconPacks: IconPacks) {
  let twig: TwigJs | null = null
  patchDrupalAttribute(DrupalAttribute)

  function renderIcon(
    packId: string,
    iconId: string,
    settings: unknown
  ): string {
    const pack = iconPacks[packId]
    if (!twig || !pack || !iconId) return ''
    const ctx = buildIconContext(pack, iconId, settings || {})
    try {
      return twig.twig({ data: pack.template }).render(ctx)
    } catch {
      return ''
    }
  }

  function registerCore(Twig: TwigJs): void {
    twig = Twig
    if (Twig.__sdcIconRegistered) return
    Twig.__sdcIconRegistered = true
    Twig.extendFunction('icon', function (packId, iconId, settings) {
      const pack = iconPacks[packId]
      if (!pack || !iconId) return ''
      const ctx = buildIconContext(pack, iconId, settings || {})
      try {
        return Twig.twig({ data: pack.template }).render(ctx)
      } catch (e) {
        console.error(
          '[SDC Icons] Error rendering icon "' + packId + ':' + iconId + '":',
          e
        )
        return ''
      }
    })
  }

  return { renderIcon, registerCore, getTwig: (): TwigJs | null => twig }
}

export function createTwigRuntime(iconPacks: IconPacks) {
  const core = createTwigCore(iconPacks)
  return { renderIcon: core.renderIcon, registerSdcRuntime: core.registerCore }
}
