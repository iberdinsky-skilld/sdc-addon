import { join, resolve } from 'node:path'
import { cwd } from 'node:process'
import type { StorybookConfig } from '@storybook/html-vite'
import type { SDCAddonOptions, SDCStorybookOptions } from '../src/sdc.d.ts'
import { CUSTOM_TEST_DEFS } from './ui-patterns-definitions.js'

const sdcStorybookOptions: SDCStorybookOptions = {
  namespace: 'umami',
  namespaces: {
    'assets': join(cwd(), './assets'),
    'parent-namespace': resolve('./parent-namespace'),
  },
  twigLib: 'twig', // Switch here to twing
  storyNodesRenderer: [
    {
      appliesTo: (item) => item?.type === 'sample',
      render: (item) => `'SAMPLE'`,
      priority: -4,
    },
    {
      appliesTo: (item) => item?.type === 'icon',
      render: (item) => {
        const attrs = item.attributes
          ? ' ' +
            Object.entries(item.attributes)
              .map(([key, value]) => {
                if (Array.isArray(value)) {
                  return `${key}="${value.join(' ')}"`
                }
                return `${key}="${value}"`
              })
              .join(' ')
          : ''
        return JSON.stringify(
          `<svg${attrs} aria-hidden="true"><use xlink:href="#${item.icon}"></use></svg>`
        )
      },
      priority: -4,
    },
  ],
  customDefs: CUSTOM_TEST_DEFS as SDCStorybookOptions['customDefs'],

  externalDefs: [
    'https://cdn.jsdelivr.net/gh/iberdinsky-skilld/sdc-addon@v0.4.3/drupal-defs/uiPatternsSchema.yml',
    join(cwd(), './drupal-defs/exBuilderSchema.yml'),
  ],
}

const config: StorybookConfig = {
  stories: [
    '../components/**/*.component.yml',
    '../parent-namespace/components/**/*.component.yml',
    '../stories/*.stories.js',
  ],
  addons: [
    '@storybook/addon-links',
    {
      name: join(cwd(), 'src/preset.ts'),
      options: {
        sdcStorybookOptions,
      } as SDCAddonOptions,
    },
  ],
  framework: {
    name: '@storybook/html-vite',
    options: {},
  },
  ...(process.env.NODE_ENV === 'production'
    ? {
        staticDirs: [
          // TODO: Make this dynamic based on namespaces.
          { from: '../components', to: '/components' },
          {
            from: '../parent-namespace/components',
            to: '/parent-namespace/components',
          },
        ],
      }
    : {}),
}

export default config
