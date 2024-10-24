export default (stories: Record<string, any>) => {
  const generatedStories: string[] = []

  const extractArgsAndSlots = (input: any) => {
    const args: Record<string, any> = {}
    const slots: Record<string, any> = {}

    for (const key in input) {
      const value = input[key]

      if (Array.isArray(value)) {
        value.forEach((item: any) => {
          if (item.type === 'component') {
            const componentName = item.component.split(':').pop()
            const kebabCaseName = componentName.replace(/-/g, '')
            const componentProps = {
              ...(item.props || {}),
              ...(item.slots || {}),
            }

            const componentContent = `\${${kebabCaseName}.component(${JSON.stringify(componentProps)})}`

            slots[key] = (slots[key] || '') + componentContent
          } else {
            slots[key] = (slots[key] || '') + `${item}`
          }
        })
      } else if (typeof value === 'object' && value !== null) {
        const nested = extractArgsAndSlots(value)
        Object.assign(args, nested.args)
        Object.entries(nested.slots).forEach(([nestedKey, nestedContent]) => {
          slots[nestedKey] = (slots[nestedKey] || '') + nestedContent
        })
      } else {
        args[key] = value
      }
    }

    return { args, slots }
  }

  Object.entries(stories).forEach(([storyKey, story]) => {
    const { args, slots } = extractArgsAndSlots(story)

    Object.entries(slots).forEach(([slotName, content]) => {
      args[slotName] = `${content}`
    })

    generatedStories.push(`
      export const ${storyKey} = {
        args: {
          ${Object.entries(args)
            .map(([key, value]) =>
              key === 'content'
                ? `"${key}": \`${value}\``
                : `"${key}": ${JSON.stringify(value)}`
            )
            .join(',\n')}
        },
        play: async ({ canvasElement }) => {
          Drupal.attachBehaviors(canvasElement, window.drupalSettings);
        },
      };
    `)
  })

  return generatedStories.join('\n')
}
