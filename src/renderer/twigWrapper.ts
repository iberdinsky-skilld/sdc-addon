// Twig.js runtime for the build-time wrapper renderer (not shipped).
import type { IconPacks } from '../sdc.d.ts'
import { toText } from './collections.ts'
import {
  isStory,
  storyContext,
  createStoryFactory,
  type StoryBase,
} from './story.ts'
import { componentNodeContext, createNodeResolver, nodeGet } from './nodes.ts'
import { createTwigCore, type TwigJs } from './twig.ts'

export function createTwigWrapperRuntime(iconPacks: IconPacks) {
  const core = createTwigCore(iconPacks)

  function renderComponentNode(node: unknown): string {
    const twig = core.getTwig()
    const id = toText(nodeGet(node, 'component'))
    if (!twig || !id) return ''
    const vars = componentNodeContext(node, resolve)
    return renderInline("{% include '" + id + "' with vars only %}", { vars })
  }

  const { resolve } = createNodeResolver({
    renderComponent: renderComponentNode,
    renderIcon: core.renderIcon,
  })

  function renderStory(
    story: Record<string, unknown>,
    base: StoryBase | undefined
  ): string {
    const ctx = storyContext(story, base, resolve)
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

  function renderInline(template: string, context: unknown): string {
    const twig = core.getTwig()
    if (!twig || !template) return template || ''
    try {
      return twig
        .twig({ data: template, allowInlineIncludes: true })
        .render(context || {})
    } catch (e) {
      console.error('[SDC] renderInline error:', e)
      return template
    }
  }

  function registerSdcRuntime(Twig: TwigJs): void {
    core.registerCore(Twig)
    if (!Twig.__sdcMergeOverridden) {
      Twig.__sdcMergeOverridden = true
      const origMerge = Twig.filters?.['merge']
      Twig.extendFilter('merge', function (this: unknown, value, params) {
        const other = Array.isArray(params) ? params[0] : undefined
        if (isStory(value) || isStory(other)) {
          return mergeStory(value, other)
        }
        return origMerge ? origMerge.call(this, value, params) : value
      })
    }
  }

  return {
    renderIcon: core.renderIcon,
    renderInline,
    makeStory,
    registerSdcRuntime,
  }
}
