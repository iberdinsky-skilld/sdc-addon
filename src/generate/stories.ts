import type { Globals } from 'storybook/internal/types'
import type { StoryDefinition, VariantDefinition } from '../sdc.d.ts'
import { capitalize, jsLiteral } from '../utils.ts'
import { isRecord } from '../guards.ts'
import { generateArgs } from './nodeCodegen.ts'

export default (
  stories: Record<string, StoryDefinition>,
  componentGlobals: Globals = {},
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
            ? `  globals: ${jsLiteral(mergedGlobals, 2)},`
            : ''
        const capitalizedKey = capitalize(storyKey)
        // 'Basic' is reserved (it carries baseArgs), so prefix a clashing story.
        const exportName =
          capitalizedKey === 'Basic'
            ? `Variant_${capitalizedKey}`
            : capitalizedKey

        return `
export const ${exportName} = {
  parameters:  {...${jsLiteral(storyParameters, 2)}, ...{docs: {description: {story: ${jsLiteral(description, 2)}}}}},
${globalsBlock}
  name: ${jsLiteral(name ?? capitalizedKey, 2)},
  args: {
    ...Basic.baseArgs,
    ${processPropsAttributes(props)}
    ${generateArgs(slots, true)}
    ${generateVariants(variants)}
  },
  ${
    library_wrapper
      ? `render: () => ${jsLiteral(wrapperHtml[storyKey] ?? '')},`
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
  variants: Record<string, VariantDefinition>
): string => {
  return Object.entries(variants)
    .map(
      ([variantKey, variantValue]) =>
        `${variantKey}: ${jsLiteral(variantValue.title)},`
    )
    .join('\n')
}

// An `attributes` prop becomes a `defaultAttributes` array-of-tuples
// ([['key', 'value'], ...]) — the shape Twig's Attribute object expects.
const processPropsAttributes = (props: Record<string, unknown>): string => {
  const { attributes, ...otherProps } = props
  if (!isRecord(attributes) || Object.keys(attributes).length === 0) {
    return generateArgs(props, false)
  }
  const propsArgs = generateArgs(otherProps, false)

  const attributeEntries = Object.entries(attributes)
    .map(([key, value]) => `['${key}', ${jsLiteral(value)}]`)
    .join(', ')

  return (
    propsArgs +
    (propsArgs ? '\n' : '') +
    `defaultAttributes: [...Basic.baseArgs.defaultAttributes || [], ${attributeEntries}],`
  )
}
