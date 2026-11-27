// Twing browser runtime: what the engine lacks for Drupal templates.
import {
  createSynchronousFilter,
  createSynchronousFunction,
  createSynchronousTest,
  type TwingSynchronousEnvironment,
} from 'twing'
import DrupalAttribute from 'drupal-attribute'
import type { IconPacks } from '../sdc.d.ts'
import { buildIconContext } from './icons.ts'
import { isMapping, isSequence } from './collections.ts'
import { addClass, setAttribute } from './renderArrayFilters.ts'
import { patchDrupalAttribute, castVarsAttributes } from './attributes.ts'
import { htmlCva, HTML_CVA_ARGUMENTS } from './cva.ts'

export { twigArgs } from './nodes.ts'

export type SdcEnv = TwingSynchronousEnvironment & {
  __sdcMergeOverridden?: boolean
  __sdcIncludeOverridden?: boolean
  loader: TwingSynchronousEnvironment['loader'] & {
    setTemplate?: (name: string, template: string) => void
  }
}

export function createTwingCore(iconPacks: IconPacks) {
  let env: SdcEnv | null = null
  patchDrupalAttribute(DrupalAttribute)

  function renderIcon(
    packId: string,
    iconId: string,
    settings: unknown
  ): string {
    const pack = iconPacks[packId]
    if (!env || !pack || !iconId) return ''
    const ctx = buildIconContext(pack, iconId, settings || {})
    try {
      return env.render('_sdc_icon_' + packId, ctx)
    } catch {
      return ''
    }
  }

  function registerCore(e: SdcEnv): void {
    env = e

    if (!e.__sdcIncludeOverridden) {
      const origInclude = e.functions.get('include')
      if (origInclude && typeof origInclude.callable === 'function') {
        e.__sdcIncludeOverridden = true
        e.addFunction(
          createSynchronousFunction(
            'include',
            (
              execCtx,
              template,
              variables,
              withContext,
              ignoreMissing,
              sandboxed
            ) => {
              const output: unknown = origInclude.callable(
                execCtx,
                template,
                castVarsAttributes(variables),
                withContext,
                ignoreMissing,
                sandboxed
              )
              return output
            },
            [...origInclude.acceptedArguments]
          )
        )
      }
    }

    const loader = e.loader
    if (typeof loader.setTemplate === 'function') {
      for (const [packId, pack] of Object.entries(iconPacks)) {
        loader.setTemplate('_sdc_icon_' + packId, pack.template)
      }
    }

    e.addFunction(
      createSynchronousFunction(
        'icon',
        (_twingCtx, packId: string, iconId: string, settings: unknown) =>
          renderIcon(packId, iconId, settings),
        [
          { name: 'pack_id' },
          { name: 'icon_id' },
          { name: 'settings', defaultValue: {} },
        ]
      )
    )

    // Drupal sets these on the element; drupal-twig-extensions wraps it in a <div>.
    e.addFilter(
      createSynchronousFilter(
        'add_class',
        (_twingCtx, value: unknown, ...classes: unknown[]) =>
          addClass(value, ...classes),
        [],
        { is_variadic: true }
      )
    )
    e.addFilter(
      createSynchronousFilter(
        'set_attribute',
        (_twingCtx, value: unknown, name: unknown, attributeValue: unknown) =>
          setAttribute(value, name, attributeValue),
        [{ name: 'name' }, { name: 'value', defaultValue: null }]
      )
    )

    e.addTest(
      createSynchronousTest(
        'sequence',
        (_twingCtx, value: unknown) => isSequence(value),
        []
      )
    )
    e.addTest(
      createSynchronousTest(
        'mapping',
        (_twingCtx, value: unknown) => isMapping(value),
        []
      )
    )

    e.addFunction(
      createSynchronousFunction(
        'html_cva',
        (_twingCtx, base, variants, compoundVariants, defaultVariant) =>
          htmlCva(base, variants, compoundVariants, defaultVariant),
        HTML_CVA_ARGUMENTS.map((name) => ({ name, defaultValue: [] }))
      )
    )
  }

  return { renderIcon, registerCore, getEnv: (): SdcEnv | null => env }
}

export function createTwingRuntime(iconPacks: IconPacks) {
  const core = createTwingCore(iconPacks)
  return {
    renderIcon: core.renderIcon,
    registerSdcRuntime: core.registerCore,
    // Twing resolves `ns:component` in include() itself.
    registerComponent: (): void => undefined,
  }
}
