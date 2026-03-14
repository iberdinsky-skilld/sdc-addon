import type { SDCAddonOptions } from './sdc.d.ts'

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
