// Twig.js browser runtime: env capture and icon().
import type Twig from 'twig'
import DrupalAttribute from 'drupal-attribute'
import type { IconPacks } from '../sdc.d.ts'
import { toText } from './collections.ts'
import { buildIconContext } from './icons.ts'
import { patchDrupalAttribute } from './attributes.ts'

export { PrintableArray } from './nodes.ts'

// Filters may return non-strings (merge returns story objects).
export type TwigJs = Omit<typeof Twig, 'extendFilter'> & {
  extendFilter(
    name: string,
    definition: (
      this: unknown,
      left: unknown,
      params: unknown[] | false
    ) => unknown
  ): void
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
    const ctx = buildIconContext(pack, iconId, settings ?? {})
    try {
      return twig.twig({ data: pack.template }).render(ctx)
    } catch (e) {
      console.error(
        '[SDC Icons] Error rendering icon "' + packId + ':' + iconId + '":',
        e
      )
      return ''
    }
  }

  function registerCore(Twig: TwigJs): void {
    twig = Twig
    if (Twig.__sdcIconRegistered) return
    Twig.__sdcIconRegistered = true
    Twig.extendFunction(
      'icon',
      (packId: unknown, iconId: unknown, settings: unknown) =>
        renderIcon(toText(packId), toText(iconId), settings)
    )
  }

  return { renderIcon, registerCore, getTwig: (): TwigJs | null => twig }
}

export function createTwigRuntime(iconPacks: IconPacks) {
  const core = createTwigCore(iconPacks)
  return { renderIcon: core.renderIcon, registerSdcRuntime: core.registerCore }
}
