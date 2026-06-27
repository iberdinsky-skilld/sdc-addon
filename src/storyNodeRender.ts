import { capitalize, convertToKebabCase, toAttributes } from './utils.ts'
import type { Component, StoryNodeRenderer } from './sdc.d.ts'

// Helper to generate argument strings (for props or slots)
export const generateArgs = (
  args: Component['props'] | Component['slots'],
  isSlot = false
): string =>
  Object.entries(args)
    .map(([key, value]) => `${key}: ${formatArgValue(value, isSlot)},`)
    .join('\n')

// Format an argument's value, handling arrays, components, and primitives
const formatArgValue = (value: any, isSlot = false): string => {
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
    if (!renderer?.render) return JSON.stringify(item)
    return renderer.render(item, formatArgValue)
  }
}

// Render component
const renderComponent = (item: Component): string => {
  const kebabCaseName = convertToKebabCase(item.component)
  const componentProps = `...{ ${generateArgs(item.props ?? {}, false)}}, ...{${generateArgs(item.slots ?? {}, true)}}`
  const storyArgs = item.story
    ? `...${kebabCaseName}.${capitalize(item.story)}.args`
    : '...{}'
  return `${kebabCaseName}.default.component({...${kebabCaseName}.Basic.baseArgs, ${storyArgs}, ${componentProps}})`
}

const renderImage = (item: any): string => {
  const attrs: Record<string, any> = { ...(item.attributes ?? {}) }
  if (item.uri != null) attrs.src = item.uri
  if (Array.isArray(item.srcset) && item.srcset.length > 0) {
    attrs.srcset = item.srcset
      .map((s: any) =>
        s && typeof s === 'object'
          ? [s.uri, s.width].filter(Boolean).join(' ')
          : s
      )
      .join(', ')
  }
  const mapped: Record<string, any> = {
    width: item.width,
    height: item.height,
    alt: item.alt ?? '',
    sizes: item.sizes,
    title: item.title,
  }
  for (const key of ['width', 'height', 'alt', 'sizes', 'title']) {
    if (mapped[key] != null) attrs[key] = mapped[key]
  }
  return JSON.stringify(`<img${toAttributes(attrs)} />`)
}

// Generate type=element
const renderElement = (item: any): string => {
  return JSON.stringify(
    `<${item.tag ?? 'div'}${toAttributes(item.attributes)}> ${item.value} </${item.tag ?? 'div'}>`
  )
}

// Generate type=markup
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
    appliesTo: (item) => item?.type === 'element' || item?.theme === 'element',
    render: (item) => renderElement(item),
    priority: -2,
  },
  {
    appliesTo: (item) => item?.type === 'markup' || item?.theme === 'markup',
    render: (item) => renderMarkup(item),
    priority: -2,
  },
  {
    appliesTo: (item) => item?.type === 'icon',
    render: (item) =>
      `_sdcRenderIcon(${JSON.stringify(item.pack_id)}, ${JSON.stringify(
        item.icon_id
      )}, ${JSON.stringify(item.settings ?? {})})`,
    priority: -5,
  },
]

// Singleton export
export const storyNodeRenderer = new StoryNodeRenderService()
storyNodeRenderer.register(defaultStoryNodes)
