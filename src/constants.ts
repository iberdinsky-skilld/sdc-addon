import type { ExternalAsset } from './sdc.d.ts'
import type { SDCAddonOptions } from './sdc.d.ts'

export const DEFAULT_DEPENDENCY_MAP: Record<string, ExternalAsset[]> = {
  'system/base/hidden': [
    {
      type: 'css',
      url: 'https://cdn.jsdelivr.net/gh/drupal/drupal/core/modules/system/css/components/hidden.module.css',
    },
  ],
  'core/drupalSettings': [
    {
      type: 'js',
      url: 'https://cdn.jsdelivr.net/gh/drupal/drupal/core/misc/drupalSettingsLoader.js',
    },
  ],
  'core/drupal': [
    {
      type: 'js',
      url: 'https://cdn.jsdelivr.net/gh/drupal/drupal/core/misc/drupal.js',
    },
    {
      type: 'js',
      url: 'https://cdn.jsdelivr.net/gh/drupal/drupal/core/misc/drupal.init.js',
    },
  ],
  'core/once': [
    {
      type: 'js',
      url: 'https://cdn.jsdelivr.net/npm/@drupal/once@1.0.1/dist/once.min.js',
    },
  ],
}

// A .twig module id, with or without a Vite query suffix.
export const TWIG_FILE_RE = /\.twig(\?.*)?$/

// Drupal core's component metadata schema; used when `validate: true`.
export const DEFAULT_SCHEMA_URL =
  'https://git.drupalcode.org/project/drupal/-/raw/HEAD/core/assets/schemas/v1/metadata.schema.json'

export const DEFAULT_ADDON_OPTIONS: SDCAddonOptions = {
  sdcStorybookOptions: {
    useBasicArgsForStories: true,
    twigLib: 'twig',
    validate: false,
  },
  vitePluginTwingDrupalOptions: {
    include: TWIG_FILE_RE,
  },
  vitePluginTwigDrupalOptions: {},
  jsonSchemaFakerOptions: {
    failOnInvalidTypes: false,
    useExamplesValue: true,
    useDefaultValue: true,
  },
}
