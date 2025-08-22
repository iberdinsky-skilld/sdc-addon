import { join, resolve } from 'node:path'
import { cwd } from 'node:process'
import type { StorybookConfig } from '@storybook/html-vite'
import type { SDCStorybookOptions } from '../src/sdc'

class TwigSafeArray<T> extends Array<T> {
  toString() {
    return this.join('')
  }
}

;(globalThis as any).TwigSafeArray = TwigSafeArray

const sdcStorybookOptions: SDCStorybookOptions = {
  namespace: 'umami',
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
  customDefs: {
    'ui-patterns://attributes': {
      type: 'object',
      properties: {
        id: {
          type: 'string',
        },
        class: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
      },
      additionalProperties: true,
    },
    'ui-patterns://boolean': {
      type: 'boolean',
    },
    'ui-patterns://enum_list': {
      type: 'array',
      items: {
        type: ['string', 'number', 'integer'],
        enum: [],
      },
    },
    'ui-patterns://enum': {
      type: ['string', 'number', 'integer'],
      enum: [],
    },
    'ui-patterns://identifier': {
      type: 'string',
      pattern:
        '(?:--|-?[A-Za-z_\\x{00A0}-\\x{10FFFF}])[A-Za-z0-9-_\\x{00A0}-\\x{10FFFF}\\.]*',
    },
    'ui-patterns://links': {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'The title of the link.',
          },
          url: {
            $ref: 'ui-patterns://url',
          },
          attributes: {
            $ref: 'ui-patterns://attributes',
          },
          link_attributes: {
            $ref: 'ui-patterns://attributes',
          },
          below: {
            type: 'array',
            items: {
              type: 'object',
            },
          },
        },
        required: ['url', 'title'],
      },
    },
    'ui-patterns://list': {
      type: 'array',
      items: {
        type: ['string', 'number', 'integer'],
      },
    },
    'ui-patterns://number': {
      type: ['number', 'integer'],
    },
    'ui-patterns://url': {
      type: 'string',
      format: 'iri-reference',
    },
    'ui-patterns://slot': {
      title: 'Slot',
    },
    'ui-patterns://string': {
      type: 'string',
    },
    'ui-patterns://unknown': {
      title: 'Unknown',
    },
    'ui-patterns://variant': {
      type: 'string',
      enum: [],
    },
  },
  designSystemConfig: {
    namespace: 'umami',
    designSystems: [
      {
        path: resolve('./sub-ds'),
        namespace: 'parent-ds',
      },
    ],
  },
  externalDefs: [
    'https://cdn.jsdelivr.net/gh/iberdinsky-skilld/sdc-addon@v0.4.3/drupal-defs/uiPatternsSchema.yml',
    join(cwd(), './drupal-defs/uiPatternsSchema.yml'),
  ],
}

const config: StorybookConfig = {
  stories: [
    '../components/**/*.component.yml',
    '../sub-ds/components/**/*.component.yml',
    '../stories/*.stories.js',
  ],
  addons: [
    '@storybook/addon-links',
    {
      name: join(cwd(), 'src/preset.ts'),
      options: {
        sdcStorybookOptions,
        vitePluginTwigDrupalOptions: {
          namespaces: {
            umami: join(cwd(), './components'),
            'parent-ds': join(cwd(), 'sub-ds/components'),
          },
        },
        vitePluginTwingDrupalOptions: {
          namespaces: {
            umami: [join(cwd(), './components')],
            'parent-ds': [join(cwd(), 'sub-ds/components')],
          },
        },
      },
    },
  ],
  framework: {
    name: '@storybook/html-vite',
    options: {},
  },
  ...(process.env.NODE_ENV === 'production'
    ? {
        staticDirs: [{ from: '../components', to: '/components' }],
      }
    : {}),
}

export default config
