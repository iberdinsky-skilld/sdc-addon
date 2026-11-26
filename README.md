# Storybook SDC Addon

Drupal [Single Directory Components](https://www.drupal.org/docs/develop/theming-drupal/using-single-directory-components) (SDC) in Storybook, without a Drupal site. Every `*.component.yml` becomes stories, its props and slots become Controls, and its Twig template renders with Drupal's Twig functions and filters, in Twig.js or Twing.

**[Live demo and feature guide](https://iberdinsky-skilld.github.io/sdc-addon)**: every feature has a page with an explanation and a working example.

[![Demo GIF](https://i.gyazo.com/2dcfa650c961679430d45eef24a82ab8.gif)](https://gyazo.com/2dcfa650c961679430d45eef24a82ab8)

## Table of Contents

- [Quickstart](#quickstart)
- [Configuration](#configuration)
- [Features](#features)
- [Addon options](#addon-options)
- [Story options](#story-options)
- [Twig engines](#twig-engines)
- [Production static build](#production-static-build)
- [Dependencies](#dependencies)
- [Known issues](#known-issues)

## Quickstart

1. In a theme, a module or an empty folder, create `package.json` if there is none:

   ```bash
   npm init
   echo "node_modules/" >> .gitignore
   ```

2. Install the addon, Vite and a Twig engine (`twig` for Twig.js, or `twing`):

   ```bash
   npm i vite twig storybook-addon-sdc --save-dev
   ```

3. Initialize Storybook and remove its example stories:

   ```bash
   npx storybook@latest init --builder vite --type html --no-dev
   rm -rf ./stories
   ```

4. Set [`"type": "module"`](https://nodejs.org/api/packages.html#type) in `package.json`.

5. Configure `.storybook/main.js` as below, then run `npm run storybook`.

## Configuration

```js
// .storybook/main.js
export default {
  stories: ['../components/**/*.component.yml'],
  addons: [
    {
      name: 'storybook-addon-sdc',
      options: {
        sdcStorybookOptions: {
          twigLib: 'twig', // or 'twing'
        },
      },
    },
  ],
  framework: { name: '@storybook/html-vite', options: {} },
}
```

Without options, `addons: ['storybook-addon-sdc']` uses Twig.js and the folder name as the namespace.

In `.storybook/main.ts` the options are typed:

```ts
import type { StorybookConfig } from '@storybook/html-vite'
import type { SDCAddonOptions } from 'storybook-addon-sdc'

const sdcOptions: SDCAddonOptions = {
  sdcStorybookOptions: { twigLib: 'twing' },
}

const config: StorybookConfig = {
  stories: ['../components/**/*.component.yml'],
  addons: [{ name: 'storybook-addon-sdc', options: sdcOptions }],
  framework: { name: '@storybook/html-vite', options: {} },
}
export default config
```

If the theme already has a `vite.config.js` (for its asset build or its own Storybook), Storybook loads it too, and its plugins can break the stories. Give Storybook an empty config instead:

```js
// .storybook/main.js
framework: {
  name: '@storybook/html-vite',
  options: { builder: { viteConfigPath: '.storybook/vite.config.js' } },
},
```

```js
// .storybook/vite.config.js
export default {}
```

## Features

Each link opens the feature's page in the live demo.

Writing stories:

- [Stories in YAML](https://iberdinsky-skilld.github.io/sdc-addon/?path=/docs/features-stories-in-yaml--docs): more stories in the component YAML or in `*.story.yml` files, parameters, globals, `library_wrapper`.
- [Story nodes](https://iberdinsky-skilld.github.io/sdc-addon/?path=/docs/features-story-nodes--docs): fill slots with components, HTML, images and icons.
- [Custom nodes](https://iberdinsky-skilld.github.io/sdc-addon/?path=/docs/features-custom-nodes--docs): your own node types for repeated markup.
- [Schemas and mock data](https://iberdinsky-skilld.github.io/sdc-addon/?path=/docs/features-schemas-and-mock-data--docs): default values, generated values, Controls, shared definitions.

Drupal APIs:

- [Namespaces](https://iberdinsky-skilld.github.io/sdc-addon/?path=/docs/features-namespaces--docs): components from base themes, modules and other folders.
- [Icon API](https://iberdinsky-skilld.github.io/sdc-addon/?path=/docs/features-icon-api--docs): `{theme}.icons.yml` and `icon()`, Drupal 11.1.
- [Design tokens](https://iberdinsky-skilld.github.io/sdc-addon/?path=/docs/features-design-tokens--docs): `{theme}.tokens.yml` as CSS variables, Drupal 11.5.
- [Variants and html_cva()](https://iberdinsky-skilld.github.io/sdc-addon/?path=/docs/features-variants-and-html-cva--docs): component variants (Drupal 11.2) and `html_cva()` (Drupal 11.4).
- [Form elements](https://iberdinsky-skilld.github.io/sdc-addon/?path=/docs/features-form-elements--docs): `form_state` for components used as form fields, Drupal 11.4.
- [Libraries and CDN](https://iberdinsky-skilld.github.io/sdc-addon/?path=/docs/features-libraries-and-cdn--docs): library dependencies from a CDN, Drupal behaviors.

Storybook:

- [Sidebar and noUi](https://iberdinsky-skilld.github.io/sdc-addon/?path=/docs/features-sidebar-and-noui--docs): grouping, folders and the `no-ui` tag, Drupal 11.3.
- [SDC in CSF stories](https://iberdinsky-skilld.github.io/sdc-addon/?path=/docs/features-sdc-in-csf-stories--docs): components in regular `.stories.js` files.
- [Accessibility](https://iberdinsky-skilld.github.io/sdc-addon/?path=/docs/features-accessibility--docs): the a11y addon on SDC stories.

## Addon options

### `sdcStorybookOptions`

- `twigLib`: `'twig'` (Twig.js, default) or `'twing'`.
- `namespace`: the name of your own namespace. Default: the name of the folder that holds `components/`.
- `namespaces`: other namespaces, `{ name: path }`. Add their component folders to `stories` too. A path without a `components/` folder is a plain Twig namespace, `@name/file.svg`.
- `customNodes`: your own story node types, `[{ match(node), render(node) }]`.
- `resolveIconSource`: `(source) => url`, rewrites icon sources such as `/libraries/...`.
- `dependencyMap`: Drupal library names to CDN assets, `{ 'core/jquery': [{ type: 'js', url }] }`. See below.
- `externalDefs`: URLs or paths of schema definition files for `$ref`.
- `customDefs`: schema definitions keyed by their `$ref`.
- `validate`: `true` checks component YAML against Drupal's metadata schema, or pass the URL of another schema. Problems are logged as warnings.
- `useBasicArgsForStories`: `true` (default) starts every story from the Basic story's values.

#### `dependencyMap`

These are always loaded, so Drupal behaviors work:

| Key                   | Assets                                           |
| --------------------- | ------------------------------------------------ |
| `system/base/hidden`  | `hidden.module.css` (`.visually-hidden` utility) |
| `core/drupalSettings` | `drupalSettingsLoader.js`                        |
| `core/drupal`         | `drupal.js`, `drupal.init.js`                    |
| `core/once`           | `once.min.js`                                    |

Other entries load only for stories of components that list them in `libraryOverrides.dependencies`.

```js
dependencyMap: {
  // Add a dependency
  'core/jquery': [{ type: 'js', url: 'https://cdn.jsdelivr.net/npm/jquery@3/dist/jquery.min.js' }],
  // Replace a built-in one
  'core/once': [{ type: 'js', url: 'https://cdn.example.com/once@2.min.js' }],
  // Turn a built-in one off
  'system/base/hidden': [],
},
```

### `vitePluginTwigDrupalOptions`

Options for [vite-plugin-twig-drupal](https://github.com/larowlan/vite-plugin-twig-drupal) when `twigLib` is `'twig'`, such as extra Twig functions and global variables:

```js
vitePluginTwigDrupalOptions: {
  functions: {
    reverse: (twig) =>
      twig.extendFunction('reverse', () => (text) => text.split(' ').reverse().join(' ')),
  },
  globalContext: {
    active_theme: 'my_theme',
    is_front_page: false,
  },
},
```

### `vitePluginTwingDrupalOptions`

Options for [vite-plugin-twing-drupal](https://github.com/christianwiedemann/vite-plugin-twing-drupal) when `twigLib` is `'twing'`. `hooks` points to a module that can change the Twing environment:

```js
vitePluginTwingDrupalOptions: {
  hooks: join(cwd(), '.storybook/twing-hooks.js'),
},
```

```js
// .storybook/twing-hooks.js
import { createSynchronousFunction } from 'twing'

export function initEnvironment(env) {
  env.addFunction(
    createSynchronousFunction('shout', (_context, text) => `${text}!`, [
      { name: 'text' },
    ])
  )
}
```

### `jsonSchemaFakerOptions`

Options for [json-schema-faker](https://github.com/json-schema-faker/json-schema-faker), which fills props and slots that have no `default` or `examples`.

## Story options

Story settings live in the component YAML under `thirdPartySettings.sdcStorybook`:

```yaml
thirdPartySettings:
  sdcStorybook:
    tags: [autodocs]
    disabledStories: [basic]
    parameters:
      layout: centered
    globals:
      theme: dark
    stories:
      preview:
        name: Preview
        description: Card with an image.
        props:
          html_tag: div
        slots:
          content: Hello!
        parameters: {}
        globals: {}
        library_wrapper: '<div class="wrapper">{{ _story }}</div>'
```

- `tags`: [Storybook tags](https://storybook.js.org/docs/writing-docs/autodocs), such as `autodocs`.
- `disabledStories`: story keys to hide, `basic` for the Basic story, or `all`.
- `parameters` and `globals`: for every story of the component; a story's own values win.
- `stories`: extra stories by key. A story can set `name`, `description`, `props`, `slots`, `parameters`, `globals` and `library_wrapper`.

A story can also be its own file, `{component}.{story}.story.yml`, in the component folder or below it, with the same keys as one entry of `stories`.

### Globals

Globals need `globalTypes` in `.storybook/preview.js`. This demo's `theme`:

```js
// .storybook/preview.js
export default {
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: ['light', 'dark'],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light' },
  decorators: [
    (Story, context) => {
      document.documentElement.dataset.theme = context.globals.theme || 'light'
      return Story()
    },
  ],
}
```

## Twig engines

Twig.js and Twing lack some of what Drupal templates use. The addon adds it, so the same templates work on both engines:

- `icon()` from the Icon API, both engines.
- `html_cva()`, both engines, with named arguments on Twig.js too.
- `|add_class` and `|set_attribute` from Drupal core: the class or attribute goes on the element itself. Twig.js had no such filters; Twing's wrapped the value in a `<div>`.
- `include()` as a function on Twig.js, which only had the `{% include %}` tag.
- `is sequence` and `is mapping` tests from Twig 3.11, both engines.
- `addClass()` and `removeClass()` take arrays, Twing Maps and the hashes Twig.js makes from `merge`, also on `create_attribute()` objects.
- Lists in slots print item by item, without commas, on Twig.js.

## Production static build

Icon pack sources are copied into the build automatically.

With Twig.js, if templates read component files with `source(componentMetadata.path ~ '/icons/x.svg')`, add the component folders to `staticDirs` for production builds:

```js
...(process.env.NODE_ENV === 'production'
  ? { staticDirs: [{ from: '../components', to: '/components' }] }
  : {}),
```

Twing needs no setup, and is the engine to use when a base theme lives outside the Storybook project.

## Dependencies

- [vite-plugin-twig-drupal](https://github.com/larowlan/vite-plugin-twig-drupal): Twig.js with Drupal functions.
- [vite-plugin-twing-drupal](https://github.com/christianwiedemann/vite-plugin-twing-drupal): Twing with Drupal functions.
- [json-schema-faker](https://github.com/json-schema-faker/json-schema-faker): values for props and slots without `default` or `examples`.
- [jsonschema](https://www.npmjs.com/package/jsonschema): the `validate` option.

## Known issues

- The addon relies on Storybook's [experimental indexers](https://storybook.js.org/docs/api/main-config/main-config-indexers).
- A component included in Twig with `only` and without `attributes` gets no `attributes` object. Pass `attributes: create_attribute()`.
