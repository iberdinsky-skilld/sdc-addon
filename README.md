# Storybook SDC Addon Documentation
Drupal Single Directory Components as stories

## Overview:

This Storybook addon streamlines the integration of Drupal Single Directory Components (SDC) into Storybook. It leverages YAML configurations and Twig templates to dynamically load components and generate stories with minimal configuration.

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

## Idea:

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

