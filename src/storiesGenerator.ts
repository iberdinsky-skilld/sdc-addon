import type { Component } from './sdc.d.ts'
import { capitalize, convertToKebabCase } from './utils.ts'
import { storyRendererRegistry } from './storiesRender.ts'

export default (stories: Component[]): string =>
  Object.entries(stories)
    .map(
      ([storyKey, { props = {}, slots = {}, variants = {} }]) => `
export const ${capitalize(storyKey)} = {
  args: {
    ...Basic.args,
    ${generateArgs(props)}
    ${generateArgs(slots, true)}
    ${generateVariants(variants)}
  },
  play: async ({ canvasElement }) => {
    Drupal.attachBehaviors(canvasElement, window.drupalSettings);
  },
};
`
    )
    .join('\n')

// Helper to generate argument strings (for props or slots)
const generateArgs = (
  args: Component['props'] | Component['slots'],
  isSlot = false
): string =>
  Object.entries(args)
    .map(([key, value]) => `${key}: ${formatArgValue(value, isSlot)},`)
    .join('\n')

// Format an argument's value, handling arrays, components, and primitives
  const formatArgValue = (value: any, isSlot: boolean): string => {
  if (Array.isArray(value)) {
    const arrayContent = value
      .map((item) => storyRendererRegistry.render(item))
    return `new TwigSafeArray(${arrayContent.join(', ')})`;
  }
  return storyRendererRegistry.render(value)
}

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
