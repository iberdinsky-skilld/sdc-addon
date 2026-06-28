// Build-time (Node) rendering of `library_wrapper` stories to static HTML,
// reusing the same loaders, extensions and runtime as the browser.
import { createSynchronousEnvironment } from 'twing'
// @ts-ignore — vite-plugin-twing-drupal ships no types
import { createSDCLoader } from 'vite-plugin-twing-drupal/src/loader/createSDCLoader.js'
// @ts-ignore — @christianwiedemann/drupal-twig-extensions ships no types
import { addDrupalExtensions as addTwingExtensions } from '@christianwiedemann/drupal-twig-extensions/twing'
import Twig from 'twig'
// @ts-ignore — drupal-twig-extensions ships no types
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
  initEnvironment?: (env: unknown) => void
  iconPacks?: IconPacks
}

export function createWrapperEnv(
  twigLib: 'twing' | 'twig',
  opts: WrapperEnvOptions
): WrapperEnv {
  return twigLib === 'twig' ? twigWrapperEnv(opts) : twingWrapperEnv(opts)
}

function twingWrapperEnv(opts: WrapperEnvOptions): WrapperEnv {
  const env = createSynchronousEnvironment(
    createSDCLoader(opts.templates, opts.namespaces) as never
  )
  addTwingExtensions(env as never)
  opts.initEnvironment?.(env)
  const rt = createTwingWrapperRuntime(opts.iconPacks ?? {})
  rt.registerSdcRuntime(env as never)
  return {
    render(componentId, props, slots, wrapper) {
      const story = rt.makeStory(componentId, props, slots, { context: {} })
      return rt.renderInline(wrapper, { _story: story })
    },
  }
}

function twigWrapperEnv(opts: WrapperEnvOptions): WrapperEnv {
  const T = Twig as unknown as {
    twig: (o: Record<string, unknown>) => { render: (c: unknown) => string }
    cache: (on: boolean) => void
  }
  T.cache(false)
  addTwigExtensions(Twig)
  opts.initEnvironment?.(Twig)
  for (const [key, src] of Object.entries(opts.templates)) {
    // Register under the `@ns/path` id (so `{% include '@assets/x.svg' %}` works)
    // and the `ns:component` id (so `{% include 'ns:component' %}` works).
    T.twig({ id: key, data: src, allowInlineIncludes: true })
    const m = key.match(/^@([^/]+)\/.*\/([^/]+)\.twig$/)
    if (m)
      T.twig({ id: `${m[1]}:${m[2]}`, data: src, allowInlineIncludes: true })
  }
  const rt = createTwigWrapperRuntime(opts.iconPacks ?? {})
  rt.registerSdcRuntime(Twig as never)
  return {
    render(componentId, props, slots, wrapper) {
      const story = rt.makeStory(componentId, props, slots, {
        context: {},
        render: (ctx) => T.twig({ ref: componentId }).render(ctx),
      })
      return rt.renderInline(wrapper, { _story: story })
    },
  }
}
