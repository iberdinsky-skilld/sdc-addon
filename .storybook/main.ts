import { join, resolve } from 'node:path'
import { cwd } from 'node:process'
import type { StorybookConfig } from '@storybook/html-vite'
import type { SDCAddonOptions, SDCStorybookOptions } from '../src/sdc.d.ts'
import { CUSTOM_TEST_DEFS } from './ui-patterns-definitions.js'

const sdcStorybookOptions: SDCStorybookOptions = {
  namespace: 'umami',
  namespaces: {
    assets: join(cwd(), './assets'),
    'parent-namespace': resolve('./parent-namespace'),
  },
  twigLib: 'twig', // Switch here to twing
  // Remap Drupal /libraries/... icon sources to CDNs for the demo packs.
  resolveIconSource: (source) => {
    const cdn: Record<string, string> = {
      '/libraries/heroicons': 'https://cdn.jsdelivr.net/npm/heroicons@2.2.0',
      '/libraries/bootstrap-icons':
        'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3',
    }
    for (const [prefix, url] of Object.entries(cdn)) {
      if (source.startsWith(prefix)) return source.replace(prefix, url)
    }
    return source
  },
  storyNodesRenderer: [
    {
      appliesTo: (item) => item?.type === 'sample',
      render: (item) => `'SAMPLE'`,
      priority: -4,
    },
    {
      // Custom story node type — render a YouTube embed from { type: youtube, id }.
      appliesTo: (item) => item?.type === 'youtube',
      render: (item) =>
        JSON.stringify(
          `<iframe width="${item.width ?? 560}" height="${item.height ?? 315}" src="https://www.youtube.com/embed/${item.id}" title="YouTube video" frameborder="0" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
        ),
      priority: -4,
    },
  ],
  customDefs: CUSTOM_TEST_DEFS as SDCStorybookOptions['customDefs'],

  dependencyMap: {
    'core/jquery': [
      {
        type: 'js',
        url: 'https://cdn.jsdelivr.net/npm/jquery@3/dist/jquery.min.js',
      },
    ],
    'jquery/ui.accordion': [
      {
        type: 'css',
        url: 'https://cdn.jsdelivr.net/npm/jquery-ui@1.13/dist/themes/base/jquery-ui.min.css',
      },
      {
        type: 'js',
        url: 'https://cdn.jsdelivr.net/npm/jquery-ui@1.13/dist/jquery-ui.min.js',
      },
    ],
  },

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
    '@storybook/addon-docs',
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
