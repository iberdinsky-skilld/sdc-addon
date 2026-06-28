// Twig.js variant of the SDC browser runtime. The virtual module is thin glue
// that passes the consumer's icon-pack data to this factory.
import type Twig from 'twig'
import DrupalAttribute from 'drupal-attribute'
import type { IconPacks } from '../sdc.d.ts'
import { buildIconContext } from './iconContext.ts'
import { patchDrupalAttribute } from './attributes.ts'
import {
  isStory,
  storyContext,
  createStoryFactory,
  type StoryBase,
} from './story.ts'

// @types/twig exports + the internal `filters` registry + our idempotency markers.
type TwigJs = typeof Twig & {
  filters?: Record<string, (value: unknown, params: unknown) => unknown>
  __sdcMergeOverridden?: boolean
  __sdcIconRegistered?: boolean
}

export function createTwigRuntime(iconPacks: IconPacks) {
  let twig: TwigJs | null = null

  patchDrupalAttribute(DrupalAttribute)

  // Render via the component's own render(): for Twig.js it handles attributes
  // (defaultAttributes + explicit create_attribute override) correctly.
  function renderStory(
    story: Record<string, unknown>,
    base: StoryBase | undefined
  ): string {
    const ctx = storyContext(story, base)
    if (base && typeof base.render === 'function') {
      try {
        return base.render(ctx)
      } catch (e) {
        console.error(
          '[SDC] render story "' + String(story['#component']) + '" error:',
          e
        )
      }
    }
    return ''
  }

  const { makeStory, mergeStory } = createStoryFactory(renderStory)

  // Render an icon node (type: icon) the same way the icon() Twig function does.
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

  // Render an inline Twig string (a story library_wrapper).
  function renderInline(template: string, context: unknown): string {
    if (!twig || !template) return template || ''
    try {
      return twig
        .twig({ data: template })
        .render((context as Record<string, unknown>) || {})
    } catch (e) {
      console.error('[SDC] renderInline error:', e)
      return template
    }
  }

  function registerSdcRuntime(Twig: TwigJs): void {
    twig = Twig

    // merge filter: keep render arrays printable, else delegate to native merge.
    if (!Twig.__sdcMergeOverridden) {
      Twig.__sdcMergeOverridden = true
      const origMerge = Twig.filters?.['merge']
      Twig.extendFilter('merge', function (this: unknown, value, params) {
        const other = Array.isArray(params) ? params[0] : undefined
        if (isStory(value) || isStory(other)) {
          return mergeStory(value, other) as unknown as string
        }
        return origMerge
          ? (origMerge.call(this, value, params) as string)
          : (value as string)
      })
    }

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

  return { renderIcon, renderInline, makeStory, registerSdcRuntime }
}
