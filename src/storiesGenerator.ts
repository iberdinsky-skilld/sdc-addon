export default (stories: Record<string, any>) => {
  const generatedStories: string[] = []

  const extractComponentArgsAndSlots = (args: any) => {
    const slots: Record<string, string> = {}

    for (const key in args) {
      if (Array.isArray(args[key])) {
        args[key].forEach((item: any) => {
          if (item.type === "component") {
            const componentName = item.component.split(":").pop()
            const kebabCaseName = componentName.replace(/([-])/g, "")
            const componentContent = `\${${kebabCaseName}.component(${JSON.stringify(
              item.args
            )})}`

            if (!slots[key]) {
              slots[key] = componentContent
            } else {
              slots[key] += componentContent
            }
          } else {
            const slotContent = item
            if (!slots[key]) {
              slots[key] = `${slotContent}`
            } else {
              slots[key] += `${slotContent}`
            }
          }
        })
      } else if (typeof args[key] === "object") {
        const nestedResult = extractComponentArgsAndSlots(args[key])
        Object.entries(nestedResult).forEach(([nestedSlot, nestedContent]) => {
          if (!slots[nestedSlot]) {
            slots[nestedSlot] = nestedContent
          } else {
            slots[nestedSlot] += nestedContent
          }
        })
      } else {
        slots[key] = `${args[key]}`
      }
    }

    return slots
  }

  Object.entries(stories).forEach(([storyKey, story]) => {
    const slots = extractComponentArgsAndSlots(story.args)
    const slotEntries = Object.entries(slots)
      .map(([slotName, content]) => `"${slotName}": \`${content}\``)
      .join(", ")

    generatedStories.push(
      `export const ${storyKey} = {
        args: {
          ${slotEntries},
          play: async ({ canvasElement }) => {
            Drupal.attachBehaviors(canvasElement, window.drupalSettings);
          },
        }
      };`
    )
  })

  return generatedStories.join("\n")
}
