import type { StorybookConfig } from "@storybook/html-vite";
const config: StorybookConfig = {
  stories: ["../components/**/*.component.yml"],
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
    {
      name: "../src",
      options: {
        sdcStorybookOptions: {
          baseNamespace: "umami"
        }
      }
    },
  ],
  framework: {
    name: "@storybook/html-vite",
    options: {},
  },
};
export default config;
