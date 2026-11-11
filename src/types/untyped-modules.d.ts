// Types for dependencies that ship none, limited to what the addon uses.

declare module 'vite-plugin-twing-drupal' {
  import type { Plugin } from 'vite'
  import type { VitePluginTwingDrupalOptions } from '../sdc.d.ts'
  export default function precompileTwigPlugin(
    options?: VitePluginTwingDrupalOptions
  ): Plugin
}

declare module 'vite-plugin-twig-drupal' {
  import type { Plugin } from 'vite'
  import type { VitePluginTwigDrupalOptions } from '../sdc.d.ts'
  export default function plugin(options?: VitePluginTwigDrupalOptions): Plugin
}

declare module 'vite-plugin-twing-drupal/src/loader/createSDCLoader.js' {
  import type { createSynchronousEnvironment } from 'twing'
  // Namespace roots as a path or a list of paths.
  export function createSDCLoader(
    templates: Record<string, string>,
    namespaces: Record<string, string[] | string>,
    name?: string
  ): Parameters<typeof createSynchronousEnvironment>[0]
}

declare module '@christianwiedemann/drupal-twig-extensions/twing' {
  import type { TwingSynchronousEnvironment } from 'twing'
  // Drupal extension config; `null` disables an entry.
  export type DrupalTwigExtensionsConfig = Record<
    string,
    string | null | Record<string, string | null>
  >
  export function addDrupalExtensions(
    env: TwingSynchronousEnvironment,
    config?: DrupalTwigExtensionsConfig
  ): void
}

declare module 'drupal-twig-extensions/twig' {
  import type Twig from 'twig'
  import type { DrupalTwigExtensionsConfig } from '@christianwiedemann/drupal-twig-extensions/twing'
  export function addDrupalExtensions(
    twig: typeof Twig,
    config?: DrupalTwigExtensionsConfig
  ): void
}
