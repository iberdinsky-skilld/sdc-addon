// Renders library_wrapper stories to static HTML at build time.
import { createSynchronousEnvironment } from 'twing'
import { createSDCLoader } from 'vite-plugin-twing-drupal/src/loader/createSDCLoader.js'
import { addDrupalExtensions as addTwingExtensions } from '@christianwiedemann/drupal-twig-extensions/twing'
import Twig from 'twig'
import { addDrupalExtensions as addTwigExtensions } from 'drupal-twig-extensions/twig'
import { createTwingWrapperRuntime } from './twingWrapper.ts'
import { createTwigWrapperRuntime } from './twigWrapper.ts'
import type { IconPacks } from '../sdc.d.ts'

export interface WrapperEnv {
  render(
    componentId: string,
    props: unknown,
    slots: unknown,
    wrapper: string
  ): string
}

interface WrapperEnvOptions {
  templates: Record<string, string>
  namespaces: Record<string, string[] | string>
  initEnvironment?: ((env: unknown) => void) | undefined
  iconPacks?: IconPacks | undefined
}

export function createWrapperEnv(
  twigLib: 'twing' | 'twig',
  opts: WrapperEnvOptions
): WrapperEnv {
  return twigLib === 'twig' ? twigWrapperEnv(opts) : twingWrapperEnv(opts)
}

function twingWrapperEnv(opts: WrapperEnvOptions): WrapperEnv {
  const env = createSynchronousEnvironment(
    createSDCLoader(opts.templates, opts.namespaces)
  )
  addTwingExtensions(env)
  opts.initEnvironment?.(env)
  const rt = createTwingWrapperRuntime(opts.iconPacks ?? {})
  rt.registerSdcRuntime(env)
  return {
    render(componentId, props, slots, wrapper) {
      const story = rt.makeStory(componentId, props, slots, { context: {} })
      return rt.renderInline(wrapper, { _story: story })
    },
  }
}

function twigWrapperEnv(opts: WrapperEnvOptions): WrapperEnv {
  Twig.cache(false)
  addTwigExtensions(Twig)
  opts.initEnvironment?.(Twig)
  for (const [key, src] of Object.entries(opts.templates)) {
    // Registered as `@ns/path` and `ns:component` so both include forms work.
    Twig.twig({ id: key, data: src, allowInlineIncludes: true })
    const m = key.match(/^@([^/]+)\/.*\/([^/]+)\.twig$/)
    if (m)
      Twig.twig({ id: `${m[1]}:${m[2]}`, data: src, allowInlineIncludes: true })
  }
  const rt = createTwigWrapperRuntime(opts.iconPacks ?? {})
  rt.registerSdcRuntime(Twig)
  return {
    render(componentId, props, slots, wrapper) {
      const story = rt.makeStory(componentId, props, slots, {
        context: {},
        render: (ctx) => Twig.twig({ ref: componentId }).render(ctx),
      })
      return rt.renderInline(wrapper, { _story: story })
    },
  }
}
