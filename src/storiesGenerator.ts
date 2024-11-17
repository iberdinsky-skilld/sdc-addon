interface Story {
  props?: Record<string, any>
  slots?: Record<string, any>
}

export default (stories: Record<string, Story>): string =>
  Object.entries(stories)
    .map(
      ([storyKey, { props = {}, slots = {} }]) => `
export const ${storyKey} = {
  args: {
    ...Basic.args,
    ${generateArgs(props)}
    ${generateArgs(slots, true)}
  },
  play: async ({ canvasElement }) => {
    Drupal.attachBehaviors(canvasElement, window.drupalSettings);
  },
};
`
    )
    .join('\n')

// Helper to generate argument strings (for props or slots)
const generateArgs = (args: Record<string, any>, isSlot = false): string =>
  Object.entries(args)
    .map(([key, value]) => `${key}: ${formatArgValue(value, isSlot)},`)
    .join('\n')

// Format an argument's value, handling arrays, components, and primitives
const formatArgValue = (value: any, isSlot: boolean): string => {
  if (Array.isArray(value)) {
    const arrayContent = value
      .map((item) =>
        item?.type === 'component'
          ? generateComponent(item)
          : JSON.stringify(item)
      )
      .join(isSlot ? ' + ' : ', ')
    return `[${arrayContent}]`
  }

  return JSON.stringify(value)
}

// Generate a component call for a story
const generateComponent = (item: any): string => {
  const componentName = item.component.split(':').pop() ?? 'unknown'
  const kebabCaseName = componentName.replace(/-/g, '')
  const componentProps = { ...item.props, ...item.slots }
  return `${kebabCaseName}.component(${JSON.stringify(componentProps)})`
}
