# Storybook SDC Addon

This addon streamlines the integration of Drupal Single Directory Components (SDC) into Storybook, allowing YAML-configured components (e.g., `*.component.yml`) to be dynamically loaded as stories in Storybook.

[![Demo GIF](https://i.gyazo.com/2dcfa650c961679430d45eef24a82ab8.gif)](https://gyazo.com/2dcfa650c961679430d45eef24a82ab8)

## Table of Contents

- [Overview](#overview)
- [Storybook Example Live](#storybook-example-live)
- [Features of the Addon](#features-of-the-addon)
- [Why Choose SDC Storybook Over Alternatives?](#why-choose-sdc-storybook-over-alternatives)
- [Quickstart Guide](#quickstart-guide)
- [Configuration](#configuration)
- [Setting Default Values](#setting-default-values)
- [Creating Experimental Stories](#creating-experimental-stories)
- [Support for Single Story Files (\*.story.yml)](#support-for-single-story-files-storyyml)
- [Regular Storybook](#regular-storybook)
- [Configuration Options](#configuration-options)
- [Dependencies](#dependencies)
- [Known Issues](#known-issues)
- [UI Patterns](#ui-patterns)

---

## Overview

This Storybook addon makes it easy to integrate Drupal Single Directory Components (SDC) into Storybook using YAML configurations and Twig templates. It dynamically loads components, allowing you to quickly create and manage stories with minimal configuration.

**It is still regular Storybook** but now with the added option to import and manage Drupal Single Directory Components (SDC).

## Storybook Example Live

You can view a [live example of the SDC Addon in Storybook](https://iberdinsky-skilld.github.io/sdc-addon), hosted on GitHub Pages, showcasing components in the `/components` directory of that repository.

## Features of the Addon

The SDC Storybook Addon simplifies the integration of Drupal Single Directory Components (SDC) into Storybook, offering several key features:

- **Vite Plugin Integration**: Leverages the vite-plugin-twig-drupal plugin to seamlessly load and process Twig templates used in SDC components.
- **Dynamic Path Resolution**: Utilizes namespaces to dynamically discover components within your project structure, eliminating the need for manual configuration.
- **Story Generation**: Automatically creates stories based on the YAML configurations of your SDC components, streamlining the story creation process.
- **JSON Schema Support**: Supports JSON Schema for props and slots, enabling the generation of mock data for missing values and ensuring data consistency.
- **Drupal Behavior Embedding**: Allows you to directly embed Drupal behaviors like `Drupal.attachBehaviors()` into Storybook previews, ensuring components behave similarly to their Drupal counterparts.
- **Custom and External Schema Definitions**: Supports custom and external JSON schema definitions to validate components based on Drupal-specific configurations (e.g., UI Patterns, Experience Builder).

## Why Choose SDC Storybook Over Alternatives?

While solutions like [SDC Styleguide](https://www.drupal.org/project/sdc_styleguide) and [Drupal Storybook](https://www.drupal.org/project/storybook) are valuable, the SDC Storybook addon offers distinct advantages:

### 1. Component Independence and Modularity

- Following the **BEM (Block Element Modifier)** methodology, a component should work independently across environments.
- The functionality of your component must not depend on the **Drupal version**, or the active **Drupal theme** — it should be portable to **any** system.

### 2. No Complex Drupal Setup Required

- No need to install or configure Drupal dependencies for component development.
- Work faster by developing frontend components in Storybook without running a heavy Drupal instance.

### 3. Simplifies DevOps and CI/CD Pipelines

- Since components are isolated, **testing and deployments** are simplified.
- You can **avoid Drupal-specific configuration** in CI pipelines, leading to more efficient and maintainable workflows.

### 4. Scalability and Flexibility with Faker.js and JSON Schema

- Tools like **Faker.js** let you generate test data for components without needing real content.
- **JSON Schema** defines component data clearly and consistently, helping maintain data integrity.

### 5. Industry-Standard Tool for Frontend Development

- **Storybook is widely adopted** in frontend development, which makes onboarding easier, even for developers unfamiliar with Drupal.
- JSON Schema enables work on components without deep Drupal knowledge, opening the project to a wider developer base.

### 6. Drupal-Specific Behavior Embedded in Components

- Embed **Drupal behaviors** (like `Drupal.attachBehaviors()`) directly into Storybook previews, ensuring consistent component behavior between Storybook and production.
- Supports `drupalSettings` and `once.js`, so components in Storybook behave identically to their Drupal counterparts.

### 7. Twig.js vs Drupal Twig

While using Drupal to render components offers tighter integration, there are strong reasons to continue using Twig.js in many scenarios:

- Many Components **Don’t Need Full Drupal Logic**. Basic components (buttons, cards, lists) rely on simple HTML and CSS, not on complex template logic. For such components, Twig.js provides sufficient rendering without the need for full Drupal preprocessing.
- Twig.js Works Well for Frontend-Focused Use Cases.
- Styling and Behavior Mismatches Can Be Managed Separately in Drupal implelentation phase.

## Quickstart Guide

1. **In theme or module or just empty directory (If package.json not yet exists)**:

   ```bash
   npm init
   echo "node_modules/" >> .gitignore
   ```

2. **Install dependencies**:

   ```bash
   npm i vite twig storybook-addon-sdc --save-dev
   ```

3. **Initialize Storybook**:

   ```bash
   npx storybook@latest init --builder vite --type html --no-dev
   ```

4. **Remove default storybook boilerplate stories (Optional)**:

   ```bash
   rm -rf ./stories
   ```

5. **Configure as described in [Configuration](#configuration)**.

6. **Add components to the `components` directory** (or copy from this [repository](https://github.com/iberdinsky-skilld/sdc-addon/tree/main/components)).

7. **Set [type: module](https://nodejs.org/api/packages.html#type) in package.json:**

   ```json
   {
     "type": "module"
   }
   ```

8. **Start Storybook**:
   ```bash
   npm run storybook
   ```

## Configuration

To configure the addon, update `.storybook/main.js` as shown below:

```js
import { join } from 'node:path' // 1. Add dependencies.
import { cwd } from 'node:process'

const config = {
  stories: ['../components/**/*.component.yml'], // 2. Set components glob.
  addons: [
    {
      name: 'storybook-addon-sdc', // 3. Configure addon.
      options: {
        sdcStorybookOptions: {
          namespace: 'umami', // Your namespace.
        },
        vitePluginTwigDrupalOptions: {
          // vite-plugin-twig-drupal options.
          namespaces: {
            umami: join(cwd(), './components'), // Your namespace and path to components.
          },
        },
        jsonSchemaFakerOptions: {}, // json-schema-faker options.
      },
    },
    // Any other addons.
    '@chromatic-com/storybook',
  ],
  framework: {
    name: '@storybook/html-vite',
    options: {},
  },
}
export default config
```

## Setting Default Values

For `json-schema-faker` to generate reliable data, use `default` or `examples` in your SDC schema:

```yaml
props:
  type: object
  properties:
    html_tag:
      type: string
      enum:
        - article
        - div
      default: article
slots:
  content:
    title: Content
    examples:
      - Hello! I'm card content
```

Refer to:

- [Drupal SDC Documentation](https://www.drupal.org/docs/develop/theming-drupal/using-single-directory-components/annotated-example-componentyml)
- [JSON Schema Documentation](https://json-schema.org/understanding-json-schema/reference/annotations)

## Creating Experimental Stories

The `sdcStorybook` configuration in the SDC YAML file provides a flexible way to define custom stories for your components. This feature allows you to use predefined props, custom slots, or even reuse stories defined elsewhere. Here's how it works:

### Example Configuration

```yaml
thirdPartySettings:
  sdcStorybook:
    stories:
      grid:
        props:
          label: Paragraph with grid
          extra_classes:
            - m-paragraph--grid
        slots:
          content:
            # 1. Basic Props and Slots
            # This card uses only the basic default props and slots defined in the component YAML.
            - type: component
              component: 'umami:card'

            # 2. Predefined Story
            # This card references an existing story (e.g., "Preview")
            # from the component YAML, which includes predefined props and slots.
            - type: component
              component: 'umami:card'
              story: Preview

            # 3. Custom Props and Slots
            # This card defines custom props to modify its behavior (e.g., setting
            # the HTML tag to 'div') and custom slots to override specific content.
            - type: component
              component: 'umami:card'
              props:
                html_tag: 'div' # Custom HTML tag for the card container
              slots:
                content: 'Hello from third grid card!'
```

### How It Works in Practice

The addon dynamically renders the components and stories as defined:

- **Basic Args:** The default `Basic.args` of the `umami:card` component are used.
- **Existing Story:** The `Preview` story is loaded, ensuring consistency across the Storybook environment.
- **Custom Slots and Props:** Overrides the default slots and props behavior with unique content for that instance.

[![Stories](https://i.gyazo.com/7212a3f44052ebde34b59a1555d96afe.png)](https://gyazo.com/7212a3f44052ebde34b59a1555d96afe)

## Support for Single Story Files (`*.story.yml`)

In addition to stories defined inside `*.component.yml` files, the addon now supports standalone story files with the `.story.yml` extension.

This means you can create independent stories for your components by simply adding a `.story.yml` file in your component directory. These files are automatically discovered and indexed by Storybook, allowing you to organize and share stories outside of the main component YAML.

**Example:**

```yaml
# components/slider/slider.badges.story.yml
name: Badges
props:
  slides:
    - type: component
      component: 'umami:badge'
      props:
        icon: timer
      slots:
        text: Hola
    - type: component
      component: 'umami:badge'
      props:
        icon: serves
      slots:
        text: Bonjour
    - type: component
      component: 'umami:badge'
      props:
        icon: difficulty
      slots:
        text: Ciao
```

### Why stories experimental?

The [community will have to decide](https://docs.google.com/document/d/1wCQLXrK1lrV2gYlqmqD2pybTql6_H1dByWIKB5xQFcQ/edit?tab=t.0#heading=h.3949vjfiqczr) what format the YAML stories should be.

## Regular storybook

All storybook functions work as usual and you can import SDC YAML into `.stories.js`

[example](https://github.com/iberdinsky-skilld/sdc-addon/blob/main/stories/page-example.stories.js)

```js
import header, {
  Preview as HeaderPreview,
} from '../components/header/header.component.yml'
import banner, {
  Preview as BannerPreview,
} from '../components/banner/banner.component.yml'

export default {
  title: 'Regular Storybook Page',
  render: () => {
    return `
      ${header.component({ ...HeaderPreview.args })}
      ${banner.component({ ...BannerPreview.args })}
    `
  },
  play: async ({ canvasElement }) => {
    Drupal.attachBehaviors(canvasElement, window.drupalSettings)
  },
}

export const Basic = {}
```

## Configuration Options

In addition to the standard configuration options, you can also specify customDefs and externalDefs to provide additional schema definitions. These options are optional and can be used to extend or override the default definitions.

### `customDefs`

The `customDefs` option allows you to define custom schema definitions directly within your configuration. This can be object with custom definitions.

Example:

```typescript
const options = {
  sdcStorybookOptions: {
    customDefs: {
      'json-schema-definitions://experience_builder.module/column-width': {
        title: 'Column Width',
        type: 'integer',
        enum: [25, 33, 50],
      },
    },
  },
}
```

### `externalDefs`

The `externalDefs` option allows you to specify an array of paths to external definition files. These paths can be URLs to CDN-hosted files or local file paths.

Example:

```typescript
const options = {
  sdcStorybookOptions: {
    externalDefs: [
      'https://cdn.jsdelivr.net/gh/iberdinsky-skilld/sdc-addon@v0.4.3/drupal-defs/uiPatternsSchema.yml',
      'https://example.com/path/to/definitions.yml',
      './local/path/to/definitions.yml',
    ],
  },
}
```

When using externalDefs, the definitions will be fetched and registered automatically.

### `validate`

The `validate` option enables schema validation for SDC components using the [JSON Schema](https://www.npmjs.com/package/jsonschema) validator. By default, the validator checks the component configurations against the global schema located at:

```
$schema: https://git.drupalcode.org/project/drupal/-/raw/HEAD/core/assets/schemas/v1/metadata.schema.json
```

#### How It Works:

- **Global Schema Validation (Default):** The addon uses the default global schema for validation. This schema is provided by Drupal and ensures that SDC components conform to the expected structure with the correct data types and properties.

- **Custom Component Schema:** If a specific SDC component includes its own `$schema` field pointing to a custom schema, the validator will use that schema for validation instead of the global one. This allows for more flexibility and component-specific validation, especially when components have custom requirements.

- **Validation Warnings:** Validation errors or warnings are logged to the console, helping developers identify any issues with component configurations. **Note:** Validation will not break the rendering of the components. Even if a validation error occurs, the component will still appear in Storybook, and the warning will be logged for review.

To enable validation, set `validate: URL of schema`:

```js
const config = {
  stories: ['../components/**/*.component.yml'],
  addons: [
    {
      name: 'storybook-addon-sdc',
      options: {
        sdcStorybookOptions: {
          validate:
            'https://git.drupalcode.org/project/drupal/-/raw/HEAD/core/assets/schemas/v1/metadata.schema.json',
        },
      },
    },
  ],
}
```

## Dependencies

- [vite-plugin-twig-drupal](https://github.com/larowlan/vite-plugin-twig-drupal): Loads Twig with Drupal functions.
- [json-schema-faker](https://github.com/json-schema-faker/json-schema-faker): Generates mock data for missing props and
- [JSON Schema validator](https://www.npmjs.com/package/jsonschema)

## Known Issues

- The addon relies on [Experimental indexers](https://storybook.js.org/docs/api/main-config/main-config-indexers).

## UI Patterns

- Variants partially supported ([Issue 3390712](https://www.drupal.org/project/drupal/issues/3390712)).
- Custom Twig filters and functions are not supported ([UI Patterns TwigExtension](https://git.drupalcode.org/project/ui_patterns/-/blob/8.x-1.x/src/Template/TwigExtension.php)).
