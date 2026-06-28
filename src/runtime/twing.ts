// Twing variant of the SDC browser runtime. The virtual module is thin glue
// that passes the consumer's icon-pack data to this factory.
import {
  createSynchronousFunction,
  createSynchronousFilter,
  type TwingSynchronousEnvironment,
} from 'twing'
import DrupalAttribute from 'drupal-attribute'
import type { IconPacks } from '../sdc.d.ts'
import { buildIconContext } from './iconContext.ts'
import {
  patchDrupalAttribute,
  toAttribute,
  castVarsAttributes,
} from './attributes.ts'
import {
  isStory,
  storyContext,
  createStoryFactory,
  type StoryBase,
} from './story.ts'

// Native env + our idempotency markers + the SDC array loader's setTemplate.
type SdcEnv = TwingSynchronousEnvironment & {
  __sdcMergeOverridden?: boolean
  __sdcIncludeOverridden?: boolean
  loader: TwingSynchronousEnvironment['loader'] & {
    setTemplate?: (name: string, template: string) => void
  }
}

export function createTwingRuntime(iconPacks: IconPacks) {
  let iconEnv: SdcEnv | null = null
  const inlineNames: Record<string, string> = {}
  let inlineSeq = 0

  patchDrupalAttribute(DrupalAttribute)

  // Render by component id (not Twing's render(), which re-wraps `attributes`
  // via Object.entries() and would drop a create_attribute() DrupalAttribute).
  function renderStory(
    story: Record<string, unknown>,
    base: StoryBase | undefined
  ): string {
    const id = story['#component'] as string
    const ctx = storyContext(story, base)
    ctx['attributes'] = toAttribute(ctx['attributes'])
    if (iconEnv) {
      try {
        return iconEnv.render(id, ctx)
      } catch (e) {
        console.error('[SDC] render story "' + id + '" error:', e)
      }
    }
    // Fallback to the component's own render() when the env is unavailable.
    if (base && typeof base.render === 'function') {
      try {
        return base.render(ctx)
      } catch {
        /* ignore */
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
    if (!iconEnv || !pack || !iconId) return ''
    const ctx = buildIconContext(pack, iconId, settings || {})
    try {
      return iconEnv.render('_sdc_icon_' + packId, ctx)
    } catch {
      return ''
    }
  }

  // Render an inline Twig string (a story library_wrapper) through the SDC env,
  // so {{ include(...) }} resolves against the same loader.
  function renderInline(template: string, context: unknown): string {
    if (!iconEnv || !template) return template || ''
    const loader = iconEnv.loader
    if (!loader || typeof loader.setTemplate !== 'function') return template
    let name = inlineNames[template]
    if (!name) {
      name = '_sdc_inline_' + inlineSeq++
      inlineNames[template] = name
    }
    try {
      loader.setTemplate(name, template)
      return iconEnv.render(name, (context as Record<string, unknown>) || {})
    } catch (e) {
      console.error('[SDC] renderInline error:', e)
      return template
    }
  }

  function registerSdcRuntime(env: SdcEnv): void {
    iconEnv = env

    // merge filter: keep render arrays printable, else delegate to native merge.
    if (!env.__sdcMergeOverridden && typeof env.filters?.get === 'function') {
      const origMerge = env.filters.get('merge')
      if (origMerge) {
        env.__sdcMergeOverridden = true
        env.addFilter(
          createSynchronousFilter(
            'merge',
            (execCtx, a, b) =>
              isStory(a) || isStory(b)
                ? mergeStory(a, b)
                : origMerge.callable(execCtx, a, b),
            [{ name: 'source' }]
          )
        )
      }
    }

    // include(): cast a plain `attributes` hash so the child gets an Attribute.
    if (
      !env.__sdcIncludeOverridden &&
      typeof env.functions?.get === 'function'
    ) {
      const origInclude = env.functions.get('include')
      if (origInclude && typeof origInclude.callable === 'function') {
        env.__sdcIncludeOverridden = true
        env.addFunction(
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

    // Register icon templates so env.render('_sdc_icon_*') finds them.
    const loader = env.loader
    if (loader && typeof loader.setTemplate === 'function') {
      for (const [packId, pack] of Object.entries(iconPacks)) {
        loader.setTemplate('_sdc_icon_' + packId, pack.template)
      }
    }

    env.addFunction(
      createSynchronousFunction(
        'icon',
        (_twingCtx, packId: string, iconId: string, settings: unknown) => {
          const pack = iconPacks[packId]
          if (!pack || !iconId) return ''
          const ctx = buildIconContext(pack, iconId, settings || {})
          try {
            return env.render('_sdc_icon_' + packId, ctx)
          } catch (e) {
            console.error(
              '[SDC Icons] Error rendering icon "' +
                packId +
                ':' +
                iconId +
                '":',
              e
            )
            return ''
          }
        },
        [
          { name: 'pack_id' },
          { name: 'icon_id' },
          { name: 'settings', defaultValue: {} },
        ]
      )
    )
  }

  return { renderIcon, renderInline, makeStory, registerSdcRuntime }
}
