# Storybook SDC Addon Documentation
Drupal Single Directory Components as stories

## Overview:

This Storybook addon streamlines the integration of Drupal Single Directory Components (SDC) into Storybook. It leverages YAML configurations and Twig templates to dynamically load components and generate stories with minimal configuration.

## Why Choose SDC Storybook Over Alternatives?

While solutions like [SDC Styleguide](https://www.drupal.org/project/sdc_styleguide) and [Drupal Storybook](https://www.drupal.org/project/storybook) offer useful tools, using SDC with Storybook addon has clear advantages.
Here’s why:

#### 1. Component Independence and Modularity
- Following the __BEM (Block Element Modifier)__ methodology, a component should work independently across environments.
- The functionality of your component must not depend on the __Drupal version__, or the active __Drupal theme__ — it should be portable to __any__ system.

#### 2. No Complex Drupal Setup Required
- You don't need to install and configure Drupal with extra dependencies just to develop or test components.
- __Frontend development becomes faster__ by working in Storybook, without the need to run heavy Drupal environments locally.

#### 3. Simplifies DevOps and CI/CD Pipelines
- Since components are isolated, __testing and deployments__ are simplified.
- You can __avoid Drupal-specific configuration__ in CI pipelines, leading to more efficient and maintainable workflows.

#### 4. Scalability and Flexibility with Faker.js and JSON Schema
- Storybook allows the use of tools like __Faker.js__ to generate fake data for components. This makes it easy to test different scenarios without needing real content.
- With __JSON Schema__, components can be defined consistently, ensuring data integrity and clear documentation for developers.

#### 5. Industry-Standard Tool for Frontend Development
- __Storybook is a de facto standard__ for frontend development, making it easier for developers — even those unfamiliar with Drupal — to contribute to the project.
- JSON Schema allows developers to work on components without needing to understand Drupal’s internals, broadening participation in the project.

#### 6. Drupal-Specific Behavior Embedded in Components
- With __SDC Storybook__, you can embed __Drupal behaviors__ like `Drupal.attachBehaviors()` directly into the component preview. This ensures the component behaves the same way as it would on the actual site.
- Support for `drupalSettings` and `once.js` within Storybook ensures components behave identically during testing as they will on the Drupal site.


## The addon includes:

- A Vite plugin to load YAML-based SDC configurations.
- Dynamic path resolution based on namespaces for component discovery.
- A story generator to create component stories from YAML files.
- Support for JSON schema-based props and Drupal behaviors.

## This addon uses:

- https://github.com/larowlan/vite-plugin-twig-drupal for load Twig with Drupal functions.
- https://github.com/json-schema-faker/json-schema-faker for generation missed props and slots.

## Installation:

```
npm i storybook-addon-sdc
```

## Configuration:

In vite-html storybook https://storybook.js.org/docs/builders/vite

main.ts
```
import type { StorybookConfig } from "@storybook/html-vite";

const config: StorybookConfig = {
  stories: ["../components/**/*.component.yml"], // Your components directory.
  addons: [
    {
      name: "storybook-addon-sdc",
      options: {
        sdcStorybookOptions: {
          namespace: "umami", // Your namespace.
        },
        vitePluginTwigDrupalOptions: {}, // vite-plugin-twig-drupal options.
        jsonSchemaFakerOptions: {}, // json-schema-faker options
      }
    },
    "@storybook/addon-essentials", // Other addons.
  ],
  framework: {
    name: "@storybook/html-vite",
    options: {},
  },
};
export default config;
```

## Experimental stories:

By default addon generates only Basic story for every component.

To create new stories you may use thirdPartySettings in SDC yaml:

```
$schema: https://git.drupalcode.org/project/drupal/-/raw/HEAD/core/assets/schemas/v1/metadata.schema.json

name: Card
status: experimental
props:
  type: object
  properties:
    html_tag:
      type: string
      title: HTML tag for wrapper
      enum:
        - article
        - div
      default: article

slots:
  content:
    title: Content
    required: true
    description: The card content.
    examples:
      - Hello! I'm card content

thirdPartySettings:
  sdcStorybook:
    stories:
      preview:
        title: Preview
        args:
          html_tag: "div"
          content:
            - type: component
              component: "umami:title"
              args:
                label: test
            - type: component
              component: "umami:read-more"
              args:
                text: test
                url: '#'
      preview2:
        title: Preview 2
        args:
          html_tag: "div"
          content:
            - type: component
              component: "umami:title"
              args:
                label: test 2
                extra_classes:
                  - 'card__title'
            - type: component
              component: "umami:read-more"
              args:
                text: test
                url: '#'
                extra_classes:
                  - 'card__read-more'
```


Or you can import yaml in regular storybook *.stories.js

### Why stories experimental?

The community will have to decide what format the yaml stories should be.


## Known issues:

- UI Patterns stories format not yet [supported](https://www.drupal.org/project/ui_patterns/issues/3480464).
- Same problem will be with `$ref: json-schema-definitions://` for SDC from Experience Builder.
- Plugin uses [Experimental indexers](https://storybook.js.org/docs/api/main-config/main-config-indexers)
- json-schema-faker not always generate good data. Better to use `default` or `examples` for SDC schema
https://www.drupal.org/docs/develop/theming-drupal/using-single-directory-components/annotated-example-componentyml
https://json-schema.org/understanding-json-schema/reference/annotations

