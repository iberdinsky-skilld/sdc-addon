import { capitalize, convertToKebabCase, toAttributes } from './utils.ts'
import type { Component, StoryNodeRenderer } from './sdc'

// Helper to generate argument strings (for props or slots)
export const generateArgs = (
  args: Component['props'] | Component['slots'],
  isSlot = false
): string =>
  Object.entries(args)
    .map(([key, value]) => `${key}: ${formatArgValue(value, isSlot)},`)
    .join('\n')

// Format an argument's value, handling arrays, components, and primitives
const formatArgValue = (value: any, isSlot: boolean): string => {
  if (Array.isArray(value)) {
    const arrayContent = value.map((item) => storyNodeRenderer.render(item))
    return `new TwigSafeArray(${arrayContent.join(', ')})`
  }

  return storyNodeRenderer.render(value)
}
class StoryNodeRenderService {
  private renderer: StoryNodeRenderer[] = []

  register(renderers: StoryNodeRenderer[]) {
    renderers.forEach((renderer) => {
      this.renderer.push(renderer)
      this.renderer.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
    })
  }

  render(item: any): string {
    const renderer = this.renderer.find((h) => h.appliesTo(item))
    return renderer?.render ? renderer.render(item) : JSON.stringify(item)
  }
}

// Render component
const renderComponent = (item: Component): string => {
  const kebabCaseName = convertToKebabCase(item.component)
  const componentProps = `...{ ${generateArgs(item.props ?? {}, false)}}, ...{${generateArgs(item.slots ?? {}, true)}}`
  const storyArgs = item.story
    ? `...${kebabCaseName}.${capitalize(item.story)}.args`
    : '...{}'
  return `${kebabCaseName}.default.component({...${kebabCaseName}.Basic.args, ${storyArgs}, ${componentProps}})`
}

// Render theme=image
const renderImage = (item: any): string => {
  return JSON.stringify(
    `<img src="${item.uri}"${toAttributes(item.attributes)}>`
  )
}

// Generate type=html_tag
const renderHtmlTag = (item: any): string => {
  return JSON.stringify(
    `<${item.tag ?? 'div'}${toAttributes(item.attributes)}> ${item.value} </${item.tag ?? 'div'}>`
  )
}

// Generate type=html_tag
const renderMarkup = (item: any): string => {
  return JSON.stringify(`${item.markup}`)
}

const defaultStoryNodes: StoryNodeRenderer[] = [
  {
    appliesTo: (item) => item?.type === 'component',
    render: (item) => renderComponent(item),
    priority: -4,
  },
  {
    appliesTo: (item) => item?.theme === 'image' || item?.type === 'image',
    render: (item) => renderImage(item),
    priority: -1,
  },
  {
    appliesTo: (item) =>
      item?.type === 'html_tag' || item?.theme === 'html_tag',
    render: (item) => renderHtmlTag(item),
    priority: -2,
  },
  {
    appliesTo: (item) => item?.type === 'markup' || item?.theme === 'markup',
    render: (item) => renderMarkup(item),
    priority: -2,
  },
]

// Singleton export
export const storyNodeRenderer = new StoryNodeRenderService()
storyNodeRenderer.register(defaultStoryNodes)
