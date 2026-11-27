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
import { isMapping, isSequence, shuffle } from './collections.ts'
import { addClass, setAttribute } from './renderArrayFilters.ts'
import { patchDrupalAttribute, castVarsAttributes } from './attributes.ts'
import { htmlCva, HTML_CVA_ARGUMENTS } from './cva.ts'
import { createWrapperRenderer, isStory } from './story.ts'

export { twigArgs } from './nodes.ts'

type SdcEnv = TwingSynchronousEnvironment & {
  __sdcMergeOverridden?: boolean
  __sdcIncludeOverridden?: boolean
  loader: TwingSynchronousEnvironment['loader'] & {
    setTemplate?: (name: string, template: string) => void
  }
}

export function createTwingRuntime(iconPacks: IconPacks) {
  let env: SdcEnv | null = null
  patchDrupalAttribute(DrupalAttribute)

  // The env renders `ns:component` itself; one template name per wrapper source.
  const inlineNames = new Map<string, string>()
  const { renderWrapper, mergeStory } = createWrapperRenderer({
    renderComponent: (id, context) => env?.render(id, context),
    renderTemplate: (template, context) => {
      if (!env?.loader.setTemplate) return ''
      let name = inlineNames.get(template)
      if (!name) {
        name = '_sdc_wrapper_' + inlineNames.size
        inlineNames.set(template, name)
      }
      env.loader.setTemplate(name, template)
      return env.render(name, context)
    },
  })

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

  function registerSdcRuntime(e: SdcEnv): void {
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

    if (!e.__sdcMergeOverridden) {
      const merge = e.filters.get('merge')
      if (merge) {
        e.__sdcMergeOverridden = true
        // `_story|merge(...)` in a library_wrapper gives a new render array.
        e.addFilter(
          createSynchronousFilter(
            'merge',
            (execCtx, a, b) => {
              if (isStory(a) || isStory(b)) return mergeStory(a, b)
              const merged: unknown = merge.callable(execCtx, a, b)
              return merged
            },
            [{ name: 'source' }]
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

    // Drupal joins nothing for null; the package's version throws on it.
    const safeJoin = e.filters.get('safe_join')
    if (safeJoin) {
      e.addFilter(
        createSynchronousFilter(
          'safe_join',
          (execCtx, value: unknown, glue: unknown) => {
            if (value == null) return ''
            const joined: unknown = safeJoin.callable(execCtx, value, glue)
            return joined
          },
          [...safeJoin.acceptedArguments]
        )
      )
    }
    e.addFilter(
      createSynchronousFilter(
        'shuffle',
        (_twingCtx, value: unknown) => shuffle(value),
        []
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

  return {
    renderIcon,
    registerSdcRuntime,
    // Twing resolves `ns:component` in include() itself.
    registerComponent: (): void => undefined,
    renderWrapper,
  }
}
