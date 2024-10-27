interface Story {
  props?: Record<string, any>;
  slots?: Record<string, any>;
}

export default (stories: Record<string, Story>): string => {
  return Object.entries(stories)
    .map(([storyKey, { props = {}, slots = {} }]) => `
      export const ${storyKey} = {
        args: {
          ${generateArgs(props)}
          ${generateArgs(slots, true)}
        },
        play: async ({ canvasElement }) => {
          Drupal.attachBehaviors(canvasElement, window.drupalSettings);
        },
      };
    `)
    .join('\n');
};

// Helper function to generate arguments (props or slots)
const generateArgs = (
  args: Record<string, any>,
  isSlot = false
): string => {
  return Object.entries(args)
    .map(([key, value]) => {
      let argString = `${key}: `;

      if (Array.isArray(value)) {
        const arrayContent = value
          .map((item) =>
            item?.type === 'component'
              ? generateComponent(item)
              : JSON.stringify(item)
          )
          .join(isSlot ? ' + ' : ', ');
        argString += `[${arrayContent}]`;
      } else {
        argString += JSON.stringify(value);
      }

      return `${argString},`; // Ensure commas are included
    })
    .join('\n');
};

// Helper function to handle component logic
const generateComponent = (item: any): string => {
  const componentName = item.component.split(':').pop();
  const kebabCaseName = componentName.replace(/-/g, '');
  const componentProps = {
    ...item.props,
    ...item.slots,
  };
  return `${kebabCaseName}.component(${JSON.stringify(componentProps)})`;
};
