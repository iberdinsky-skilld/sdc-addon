import type { Component } from './sdc.d.ts'
import { capitalize } from './utils.ts'
import { generateArgs } from './storyNodeRender.ts'

export default (stories: Component[]): string =>
  Object.entries(stories)
    .map(
      ([
        storyKey,
        {
          props = {},
          slots = {},
          variants = {},
          description = '',
          name = undefined,
          library_wrapper = '',
        },
      ]) => `
export const ${capitalize(storyKey)} = {
  parameters: {docs: {description: {story: ${JSON.stringify(description, null, 2)}}}},
  name: ${JSON.stringify(name ?? capitalize(storyKey), null, 2)},
  args: {
    ...Basic.baseArgs,
    ${generateArgs(props, false)}
    ${generateArgs(slots, true)}
    ${generateVariants(variants)}
  },
  ${
    library_wrapper
      ? `decorators: [
        (Story) => {
          const wrapper = ${JSON.stringify(library_wrapper)};
          if (!wrapper) return Story();

          // Replace {{ _story }} with the actual story component
          const wrappedHtml = wrapper.replace('{{ _story }}', Story());
          return wrappedHtml;
        }
      ],`
      : ''
  }
  play: async ({ canvasElement }) => {
    Drupal.attachBehaviors(canvasElement, window.drupalSettings);
  },
};
`
    )
    .join('\n')

// Helper to generate variants args
const generateVariants = (
  variants: Record<string, { title: string }>
): string => {
  return Object.entries(variants)
    .map(
      ([variantKey, variantValue]) =>
        `${variantKey}: ${JSON.stringify(variantValue.title)},`
    )
    .join('\n')
}
