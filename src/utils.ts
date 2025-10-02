import { dirname, sep } from 'path'

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

export const deriveGroupFromPath = (fileName: string) => {
  const dir = dirname(fileName)
  const parts = dir.split(sep).filter(Boolean)
  const lower = parts.map((p) => p.toLowerCase())
  const index = lower.lastIndexOf('components')

  // We need two segments after 'components' to count it as a real group:
  // e.g. components/atoms/button -> group = atoms
  // e.g. components/dummy -> fallback to SDC
  if (index !== -1 && parts[index + 2]) {
    return parts[index + 1]
  }

  return 'SDC'
}