// Twing runtime for the build-time wrapper renderer (not shipped).
import { createSynchronousFilter } from 'twing'
import type { IconPacks } from '../sdc.d.ts'
import { toPlainObject, toText } from './collections.ts'
import { toAttribute } from './attributes.ts'
import {
  isStory,
  storyContext,
  createStoryFactory,
  type StoryBase,
} from './story.ts'
import { componentNodeContext, createNodeResolver, nodeGet } from './nodes.ts'
import { createTwingCore, type SdcEnv } from './twing.ts'

export function createTwingWrapperRuntime(iconPacks: IconPacks) {
  const core = createTwingCore(iconPacks)
  const inlineNames: Record<string, string> = {}
  let inlineSeq = 0

  function renderComponentNode(node: unknown): string {
    const env = core.getEnv()
    const id = toText(nodeGet(node, 'component'))
    if (!env || !id) return ''
    const ctx = componentNodeContext(node, resolve)
    try {
      return env.render(id, ctx)
    } catch (e) {
      console.error('[SDC] render node component "' + id + '" error:', e)
      return ''
    }
  }

  const { resolve } = createNodeResolver({
    renderComponent: renderComponentNode,
    renderIcon: core.renderIcon,
  })

  function renderStory(
    story: Record<string, unknown>,
    base: StoryBase | undefined
  ): string {
    const env = core.getEnv()
    const id = toText(story['#component'])
    const ctx = storyContext(story, base, resolve)
    ctx['attributes'] = toAttribute(ctx['attributes'])
    if (env) {
      try {
        return env.render(id, ctx)
      } catch (e) {
        console.error('[SDC] render story "' + id + '" error:', e)
      }
    }
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

  function renderInline(template: string, context: unknown): string {
    const env = core.getEnv()
    if (!env || !template) return template || ''
    const loader = env.loader
    if (typeof loader.setTemplate !== 'function') return template
    let name = inlineNames[template]
    if (!name) {
      name = '_sdc_inline_' + inlineSeq++
      inlineNames[template] = name
    }
    try {
      loader.setTemplate(name, template)
      return env.render(name, toPlainObject(context) ?? {})
    } catch (e) {
      console.error('[SDC] renderInline error:', e)
      return template
    }
  }

  function registerSdcRuntime(env: SdcEnv): void {
    core.registerCore(env)
    if (!env.__sdcMergeOverridden) {
      const origMerge = env.filters.get('merge')
      if (origMerge) {
        env.__sdcMergeOverridden = true
        env.addFilter(
          createSynchronousFilter(
            'merge',
            (execCtx, a, b) => {
              if (isStory(a) || isStory(b)) return mergeStory(a, b)
              const merged: unknown = origMerge.callable(execCtx, a, b)
              return merged
            },
            [{ name: 'source' }]
          )
        )
      }
    }
  }

  return {
    renderIcon: core.renderIcon,
    renderInline,
    makeStory,
    registerSdcRuntime,
  }
}
