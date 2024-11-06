# Storybook SDC Addon Documentation

This addon streamlines the integration of Drupal Single Directory Components (SDC) into Storybook, allowing YAML-configured components (e.g., `*.component.yml`) to be loaded dynamically as stories in Storybook.

[![Demo GIF](https://i.gyazo.com/2dcfa650c961679430d45eef24a82ab8.gif)](https://gyazo.com/2dcfa650c961679430d45eef24a82ab8)

## Table of Contents
- [Overview](#overview)
- [Why Choose SDC Storybook Over Alternatives?](#why-choose-sdc-storybook-over-alternatives)
- [Features of the Addon](#features-of-the-addon)
- [Dependencies](#dependencies)
- [Quickstart Guide](#quickstart-guide)
- [Configuration](#configuration)
- [Setting Default Values](#setting-default-values)
- [Creating Experimental Stories](#creating-experimental-stories)
- [Known Issues](#known-issues)
- [UI Patterns](#ui-patterns)

---

## Overview
This Storybook addon makes it easy to integrate Drupal Single Directory Components (SDC) into Storybook using YAML configurations and Twig templates. It dynamically loads components, allowing you to quickly create and manage stories with minimal configuration.

## Why Choose SDC Storybook Over Alternatives?

While solutions like [SDC Styleguide](https://www.drupal.org/project/sdc_styleguide) and [Drupal Storybook](https://www.drupal.org/project/storybook) are valuable, the SDC Storybook addon offers distinct advantages:

### 1. Component Independence and Modularity
- Following the __BEM (Block Element Modifier)__ methodology, a component should work independently across environments.
- The functionality of your component must not depend on the __Drupal version__, or the active __Drupal theme__ — it should be portable to __any__ system.

### 2. No Complex Drupal Setup Required
   - No need to install or configure Drupal dependencies for component development.
   - Work faster by developing frontend components in Storybook without running a heavy Drupal instance.

### 3. Simplifies DevOps and CI/CD Pipelines
- Since components are isolated, __testing and deployments__ are simplified.
- You can __avoid Drupal-specific configuration__ in CI pipelines, leading to more efficient and maintainable workflows.

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

- Many Components __Don’t Need Full Drupal Logic__. Basic components (buttons, cards, lists) rely on simple HTML and CSS, not on complex template logic. For such components, Twig.js provides sufficient rendering without the need for full Drupal preprocessing.
- Twig.js Works Well for Frontend-Focused Use Cases.
- Styling and Behavior Mismatches Can Be Managed Separately in Drupal implelentation phase.

## Features of the Addon
- Vite plugin for loading YAML-based SDC configurations.
- Dynamic path resolution based on namespaces for easy component discovery.
- Story generator that creates stories directly from YAML files.
- JSON schema-based props and support for Drupal behaviors.

## Dependencies
- [vite-plugin-twig-drupal](https://github.com/larowlan/vite-plugin-twig-drupal): Loads Twig with Drupal functions.
- [json-schema-faker](https://github.com/json-schema-faker/json-schema-faker): Generates mock data for missing props and slots.

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

7. **Start Storybook**:
   ```bash
   npm run storybook
   ```

## Configuration

To configure the addon, update `.storybook/main.js` as shown below:

```js
import { join } from "node:path"; // 1. Add path dependency.

const config = {
  stories: ["../components/**/*.component.yml"], // 2. Set components glob.
  addons: [
    {
      name: "storybook-addon-sdc", // 3. Configure addon.
      options: {
        sdcStorybookOptions: {
          namespace: "umami", // Your namespace.
        },
        vitePluginTwigDrupalOptions: { // vite-plugin-twig-drupal options.
          namespaces: {
            umami: join(__dirname, "/components")  // Your namespace and path to components.
          }
        },
        jsonSchemaFakerOptions: {}, // json-schema-faker options.
      }
    },
    // Any other addons.
    "@storybook/addon-essentials",
    "@chromatic-com/storybook",
    "@storybook/addon-interactions",
  ],
  framework: {
    name: "@storybook/html-vite",
    options: {},
  },
};
export default config;
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
By default, the addon generates only a basic story for each component. To add more stories, use `thirdPartySettings` in the SDC YAML file:

```yaml
thirdPartySettings:
  sdcStorybook:
    stories:
      preview:
        title: Preview
        props:
          html_tag: "div"
        slots:
          content:
            - type: component
              component: "umami:title"
              props:
                label: test
      preview2:
        title: Preview2
        props:
          html_tag: "div"
        slots:
          content:
            - type: component
              component: "umami:title"
              props:
                label: test2
```

Alternatively, you can import the YAML file in a `.stories.js` file within Storybook.

### Why stories experimental?

The [community will have to decide](https://docs.google.com/document/d/1wCQLXrK1lrV2gYlqmqD2pybTql6_H1dByWIKB5xQFcQ/edit?tab=t.0#heading=h.3949vjfiqczr) what format the YAML stories should be.

## Known Issues
- `$ref: json-schema-definitions://` for SDC from Experience Builder is unsupported.
- The addon relies on [Experimental indexers](https://storybook.js.org/docs/api/main-config/main-config-indexers).

## UI Patterns
- Partial support for UI Patterns SDC format ([Issue 3480464](https://www.drupal.org/project/ui_patterns/issues/3480464)).
- Variants are not yet supported ([Issue 3390712](https://www.drupal.org/project/drupal/issues/3390712)).
- Custom Twig filters and functions are not supported ([UI Patterns TwigExtension](https://git.drupalcode.org/project/ui_patterns/-/blob/8.x-1.x/src/Template/TwigExtension.php)).

