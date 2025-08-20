import { readdirSync, existsSync } from 'fs'
import { join, resolve } from 'path'

export const capitalize = (str: string) => str[0].toUpperCase() + str.slice(1)

export const convertToKebabCase = (str: string): string =>
  str.replace(/[-:]/g, '')

export const getSubdirectories = (baseDir: string): string[] =>
  readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(baseDir, entry.name))

export const resolveComponentPath = (
  namespace: string,
  component: string
): string | undefined => {
  const baseDir = resolve('./components')
  const directories = [baseDir, ...getSubdirectories(baseDir)]
  const possiblePaths = directories.map((dir) =>
    join(dir, component, `${component}.component.yml`)
  )
  return possiblePaths.find(existsSync)
}

export const toAttributes = (attrs: any): string => {
  if (!attrs) return '';
  return ' ' + Object.entries(attrs)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        value = value.join(" ");
      }
      return `${key}="${value}"`;
    })
    .join(" ");
}
