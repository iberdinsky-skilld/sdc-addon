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

export const DEFAULT_ADDON_OPTIONS: SDCAddonOptions = {
  sdcStorybookOptions: {
    useBasicArgsForStories: true,
    twigLib: 'twig',
    validate: false,
    // validate:
    //   'https://git.drupalcode.org/project/drupal/-/raw/HEAD/core/assets/schemas/v1/metadata.schema.json',
  },
  vitePluginTwingDrupalOptions: {
    include: /\.twig(\?.*)?$/,
  },
  vitePluginTwigDrupalOptions: {},
  jsonSchemaFakerOptions: {
    failOnInvalidTypes: false,
    useExamplesValue: true,
    useDefaultValue: true,
  },
}
