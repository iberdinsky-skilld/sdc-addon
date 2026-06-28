import type { Component } from '../sdc.d.ts'
import { capitalize } from '../utils.ts'
import { generateArgs } from './nodeCodegen.ts'

export default (
  stories: Component[],
  componentGlobals: Record<string, any> = {},
  componentId = '',
  wrapperHtml: Record<string, string> = {}
): string =>
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
          parameters = undefined,
          globals = undefined,
          thirdPartySettings = undefined,
        },
      ]) => {
        const storyParameters =
          thirdPartySettings?.sdcStorybook?.parameters ?? parameters ?? {}
        const storyGlobals =
          thirdPartySettings?.sdcStorybook?.globals ?? globals ?? {}
        const mergedGlobals = {
          ...componentGlobals,
          ...storyGlobals,
        }
        const globalsBlock =
          Object.keys(mergedGlobals).length > 0
            ? `  globals: ${JSON.stringify(mergedGlobals, null, 2)},`
            : ''
        const capitalizedKey = capitalize(storyKey)
        // 'Basic' is reserved (it carries baseArgs), so prefix a clashing story.
        const exportName =
          capitalizedKey === 'Basic'
            ? `Variant_${capitalizedKey}`
            : capitalizedKey

        return `
export const ${exportName} = {
  parameters:  {...${JSON.stringify(storyParameters, null, 2)}, ...{docs: {description: {story: ${JSON.stringify(description, null, 2)}}}}},
${globalsBlock}
  name: ${JSON.stringify(name ?? capitalizedKey, null, 2)},
  args: {
    ...Basic.baseArgs,
    ${processPropsAttributes(props)}
    ${generateArgs(slots, true)}
    ${generateVariants(variants)}
  },
  ${
    library_wrapper
      ? `render: () => ${JSON.stringify(wrapperHtml[storyKey] ?? '')},`
      : ''
  }
  play: async ({ canvasElement }) => {
    Drupal.attachBehaviors(canvasElement, window.drupalSettings);
  },
};
`
      }
    )
    .join('\n')

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

// An `attributes` prop becomes a `defaultAttributes` array-of-tuples
// ([['key', 'value'], ...]) — the shape Twig's Attribute object expects.
const processPropsAttributes = (props: Record<string, any>): string => {
  if (
    !props ||
    !props.attributes ||
    Object.keys(props.attributes).length === 0
  ) {
    return generateArgs(props, false)
  }

  const { attributes, ...otherProps } = props
  const propsArgs = generateArgs(otherProps, false)

  const attributeEntries = Object.entries(attributes)
    .map(([key, value]) => `['${key}', ${JSON.stringify(value)}]`)
    .join(', ')

  return (
    propsArgs +
    (propsArgs ? '\n' : '') +
    `defaultAttributes: [...Basic.baseArgs.defaultAttributes || [], ${attributeEntries}],`
  )
}
