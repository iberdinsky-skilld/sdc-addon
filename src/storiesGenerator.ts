import type { Component } from './sdc.d.ts'
import { capitalize } from './utils.ts'
import { generateArgs } from './storyNodeRender.ts'

export default (stories: Component[]): string =>
  Object.entries(stories)
    .map(
      ([storyKey, { props = {}, slots = {}, variants = {} }]) => `
export const ${capitalize(storyKey)} = {
  args: {
    ...Basic.args,
    ${generateArgs(props, false)}
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
