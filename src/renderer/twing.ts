// Twing browser runtime: env capture, icon() and include casting. The wrapper
// machinery (makeStory/merge/resolver) lives in twingWrapper.ts, harness-only.
import {
  createSynchronousFunction,
  type TwingSynchronousEnvironment,
} from 'twing'
import DrupalAttribute from 'drupal-attribute'
import type { IconPacks } from '../sdc.d.ts'
import { buildIconContext } from './icons.ts'
import { patchDrupalAttribute, castVarsAttributes } from './attributes.ts'

export { PrintableArray } from './nodes.ts'

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

    if (!e.__sdcIncludeOverridden && typeof e.functions?.get === 'function') {
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
            ) =>
              origInclude.callable(
                execCtx,
                template,
                castVarsAttributes(variables),
                withContext,
                ignoreMissing,
                sandboxed
              ),
            [...origInclude.acceptedArguments]
          )
        )
      }
    }

    const loader = e.loader
    if (loader && typeof loader.setTemplate === 'function') {
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
  }

  return { renderIcon, registerCore, getEnv: (): SdcEnv | null => env }
}

export function createTwingRuntime(iconPacks: IconPacks) {
  const core = createTwingCore(iconPacks)
  return { renderIcon: core.renderIcon, registerSdcRuntime: core.registerCore }
}
