// A Drupal subtheme whose base theme lives outside the Storybook project root.
import { resolve } from 'node:path'
import type { StorybookConfig } from '@storybook/html-vite'
import type { SDCAddonOptions } from '../../../../../src/index.ts'

const sdcOptions: SDCAddonOptions = {
  sdcStorybookOptions: {
    namespace: 'subtheme',
    namespaces: { base_theme: resolve('../base_theme') },
    twigLib: 'twing',
  },
}

const config: StorybookConfig = {
  stories: [
    '../components/**/*.component.yml',
    '../../base_theme/components/**/*.component.yml',
  ],
  addons: [{ name: resolve('../../../../src/preset.ts'), options: sdcOptions }],
  framework: { name: '@storybook/html-vite', options: {} },
}

export default config
