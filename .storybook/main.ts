import { join, resolve } from 'node:path'
import { cwd } from 'node:process'
import type { StorybookConfig } from '@storybook/html-vite'
import type { SDCAddonOptions, SDCStorybookOptions } from '../src/index.ts'
import { CUSTOM_TEST_DEFS } from './ui-patterns-definitions.ts'

const sdcStorybookOptions: SDCStorybookOptions = {
  namespace: 'umami',
  namespaces: {
    assets: join(cwd(), './assets'),
    'parent-namespace': resolve('./parent-namespace'),
  },
  // 'twig' or 'twing'; the e2e run sets SDC_TWIG_LIB.
  twigLib: process.env.SDC_TWIG_LIB === 'twing' ? 'twing' : 'twig',
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
  // Custom node types, used in plain and library_wrapper slots.
  customNodes: [
    {
      match: (item) => item.type === 'sample',
      render: () => 'SAMPLE',
    },
    {
      // Render a YouTube embed from { type: youtube, id }.
      match: (item) => item.type === 'youtube',
      render: ({ id, width, height }) =>
        `<iframe width="${typeof width === 'number' ? width : 560}" height="${typeof height === 'number' ? height : 315}" src="https://www.youtube.com/embed/${typeof id === 'string' ? id : ''}" title="YouTube video" frameborder="0" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`,
    },
    {
      // { type: link, url, value } -> <a>; `value` is resolved by the pipeline.
      match: (item) => item.type === 'link',
      render: (item) => ({
        type: 'element',
        tag: 'a',
        attributes: { class: 'custom-link', href: item.url ?? '#' },
        value: item.value,
      }),
    },
  ],
  customDefs: CUSTOM_TEST_DEFS,

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
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
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
  // Builds only: in dev these paths would shadow Vite's modules.
  ...(process.env.NODE_ENV === 'production'
    ? {
        staticDirs: [
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
