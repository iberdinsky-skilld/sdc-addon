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
    ${processPropsAttributes(props)}
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

// Processes the 'attributes' prop to convert it to defaultAttributes array format
const processPropsAttributes = (props: Record<string, any>): string => {
  if (
    !props ||
    !props.attributes ||
    Object.keys(props.attributes).length === 0
  ) {
    return generateArgs(props, false)
  }

  // Clone props without attributes
  const { attributes, ...otherProps } = props
  const propsArgs = generateArgs(otherProps, false)

  // Convert attributes object to array-of-tuples format for Twig Attribute
  // Same format as defaultAttributes: [['key', 'value'], ['key2', 'value2']]
  const attributeEntries = Object.entries(attributes)
    .map(([key, value]) => `['${key}', ${JSON.stringify(value)}]`)
    .join(', ')

  return (
    propsArgs +
    (propsArgs ? '\n' : '') +
    `defaultAttributes: [...Basic.baseArgs.defaultAttributes || [], ${attributeEntries}],`
  )
}
