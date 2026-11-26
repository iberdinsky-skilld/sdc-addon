// Twig.js browser runtime: env capture and icon().
import type Twig from 'twig'
import DrupalAttribute from 'drupal-attribute'
import type { IconPacks } from '../sdc.d.ts'
import { isMapping, isSequence, toPlainObject, toText } from './collections.ts'
import { buildIconContext } from './icons.ts'
import { htmlCva, HTML_CVA_ARGUMENTS, twigJsArguments } from './cva.ts'
import { addClass, setAttribute } from './renderArrayFilters.ts'
import { castVarsAttributes, patchDrupalAttribute } from './attributes.ts'

export { twigArgs } from './nodes.ts'

// Filters and functions may return non-strings (story objects, html_cva).
export type TwigJs = Omit<typeof Twig, 'extendFilter' | 'extendFunction'> & {
  extendFunction(
    name: string,
    definition: (...args: unknown[]) => unknown
  ): void
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

const INCLUDE_ARGUMENTS = [
  'template',
  'variables',
  'with_context',
  'ignore_missing',
] as const

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
    Twig.extendTest('sequence', (value: unknown) => isSequence(value))
    Twig.extendTest('mapping', (value: unknown) => isMapping(value))
    Twig.extendFilter('add_class', (value, params) =>
      addClass(value, ...(params || []))
    )
    Twig.extendFilter('set_attribute', (value, params) => {
      const [name, attributeValue] = params || []
      return setAttribute(value, name, attributeValue)
    })
    // twig.js has the include tag only; the function renders through the tag.
    Twig.extendFunction(
      'include',
      function (this: unknown, ...args: unknown[]) {
        const [template, variables, withContext, ignoreMissing] =
          twigJsArguments(args, INCLUDE_ARGUMENTS)
        const context: unknown =
          withContext === false ? {} : Reflect.get(Object(this), 'context')
        const vars = castVarsAttributes({
          ...toPlainObject(context),
          ...toPlainObject(variables),
        })
        return Twig.twig({
          data: `{% include _sdc_template ${ignoreMissing === true ? 'ignore missing ' : ''}with _sdc_vars only %}`,
          allowInlineIncludes: true,
        }).render({ _sdc_template: template, _sdc_vars: vars })
      }
    )
    Twig.extendFunction('html_cva', (...args: unknown[]) => {
      const [base, variants, compoundVariants, defaultVariant] =
        twigJsArguments(args, HTML_CVA_ARGUMENTS)
      return htmlCva(base, variants, compoundVariants, defaultVariant)
    })
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
