import { join } from 'node:path'
import type { StorybookConfig } from '@storybook/html-vite'
const config: StorybookConfig = {
  stories: ['../components/**/*.component.yml', '../stories/*.stories.js'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    {
      name: '../src',
      options: {
        sdcStorybookOptions: {
          baseNamespace: 'umami',
        },
        vitePluginTwigDrupalOptions: {
          namespaces: {
            umami: join(__dirname, '../components'),
          },
        },
      },
    },
  ],
  framework: {
    name: '@storybook/html-vite',
    options: {},
  },
}
export default config
