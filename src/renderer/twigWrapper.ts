// Full Twig.js runtime for the build-time harness: core (icon) plus the
// `_story|merge` render-array machinery. Not shipped to the browser.
import type { IconPacks } from '../sdc.d.ts'
import { entries } from './collections.ts'
import { toAttribute } from './attributes.ts'
import {
  isStory,
  storyContext,
  createStoryFactory,
  type StoryBase,
} from './story.ts'
import { createNodeResolver, nodeGet } from './nodes.ts'
import { createTwigCore, type TwigJs } from './twig.ts'

export function createTwigWrapperRuntime(iconPacks: IconPacks) {
  const core = createTwigCore(iconPacks)

  function renderComponentNode(node: unknown): string {
    const twig = core.getTwig()
    const id = String(nodeGet(node, 'component') ?? '')
    if (!twig || !id) return ''
    const vars: Record<string, unknown> = {}
    for (const src of [nodeGet(node, 'props'), nodeGet(node, 'slots')]) {
      for (const [k, v] of entries(src)) vars[k as string] = resolve(v)
    }
    vars['attributes'] = toAttribute(vars['attributes'])
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
        .twig({ data: template, allowInlineIncludes: true } as never)
        .render((context as Record<string, unknown>) || {})
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
          return mergeStory(value, other) as unknown as string
        }
        return origMerge
          ? (origMerge.call(this, value, params) as string)
          : (value as string)
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
