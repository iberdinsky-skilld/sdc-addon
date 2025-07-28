import { convertToKebabCase } from './utils.ts'
import type { Component } from './sdc'

export type StoryRenderer = {
  appliesTo: (item: any) => boolean;
  render: (item: any) => string;
  priority?: number;
};

class StoryRendererRegistry {
  private renderer: StoryRenderer[] = [];

  register(hook: StoryRenderer) {
    this.renderer.push(hook);
    this.renderer.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  render(item: any): string {
    const renderer = this.renderer.find(h => h.appliesTo(item));
    return renderer?.render(item) ?? JSON.stringify(item);
  }
}

// Render component
const renderComponent = (item: Component): string => {
  const kebabCaseName = convertToKebabCase(item.component)
  const componentProps = { ...item.props, ...item.slots }

  const storyArgs = item.story
    ? `...${kebabCaseName}.${item.story}.args`
    : '...{}'
  return `${kebabCaseName}.default.component({...${kebabCaseName}.Basic.args, ${storyArgs}, ...${JSON.stringify(componentProps)}})`
}

// Render theme=image
const renderImage = (item: any): string => {
  return `'<img src="${item.uri}">'`;
}

// Generate type=html_tag
const renderHtmlTag = (item: any): string => {
  return `'<${item.tag}> ${item.value} </${item.tag}>'`;
}

const defaultHooks: StoryRenderer[] = [
  {
    appliesTo: item => item?.type === 'component',
    render: item => renderComponent(item),
    priority: -4,
  },
  {
    appliesTo: item => item?.theme === 'image',
    render: item => renderImage(item),
    priority: -1,
  },
  {
    appliesTo: item => item?.type === 'html_tag',
    render: item => renderHtmlTag(item),
    priority: -2,
  },
];

// Singleton export
export const storyRendererRegistry = new StoryRendererRegistry();
defaultHooks.forEach(renderer => storyRendererRegistry.register(renderer));



