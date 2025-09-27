export const capitalize = (str: string) => str[0].toUpperCase() + str.slice(1)

export const convertToKebabCase = (str: string): string =>
  str.replace(/[-:]/g, '')

export const toAttributes = (attrs: any): string => {
  if (!attrs) return ''
  return (
    ' ' +
    Object.entries(attrs)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          value = value.join(' ')
        }
        return `${key}="${value}"`
      })
      .join(' ')
  )
}
