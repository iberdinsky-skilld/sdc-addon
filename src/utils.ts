import { readdirSync, existsSync } from 'fs'
import { join, resolve, sep, relative } from 'path'
import { NamespaceDefinition } from './sdc'
import type { Alias } from 'vite'

export const capitalize = (str: string) => str[0].toUpperCase() + str.slice(1)

export const convertToKebabCase = (str: string): string =>
  str.replace(/[-:]/g, '')

export const getSubdirectories = (baseDir: string): string[] =>
  readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(baseDir, entry.name))

export const resolveComponentPath = (
  namespace: string,
  component: string,
  namespaces: Namespaces
): string | undefined => {
  const baseDir = namespaces.findPath(namespace)
  const directories = [baseDir, ...getSubdirectories(baseDir)]
  const possiblePaths = directories.map((dir) =>
    join(dir, component, `${component}.component.yml`)
  )
  return possiblePaths.find(existsSync)
}

export const getProjectName = (p: string): string => {
  const fullPath = resolve(p)
  const parts = fullPath.split(sep)
  const i = parts.lastIndexOf('components')
  if (i < 1) {
    throw new Error(`Could not find 'components' folder in path: ${fullPath}`)
  }
  return parts[i - 1]
}

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
export const namespaceHelper = (
  namespaceDefinition: NamespaceDefinition
): Namespaces => {
  return new Namespaces(namespaceDefinition)
}
export class Namespaces {
  private namespaces?: Record<string, string>
  private stripTrailingSlash = (p: string) => p.replace(/\/+$/g, '')

  constructor(namespaceDefinition: NamespaceDefinition) {
    this.namespaces = namespaceDefinition.namespaces
    this.namespaces[namespaceDefinition.namespace] = process.cwd()
  }

  public toViteAlias(): Alias[] {
    const aliases: Alias[] = []

    Object.keys(this.namespaces).forEach((namespace) => {
      aliases.push({
        find: '@' + namespace,
        replacement: resolve(this.namespaces[namespace], 'components').replace(
          /\\/g,
          '/'
        ),
      })
    })
    return aliases
  }
  public findPath = (namespace: string): string => {
    return this.namespaces[namespace] || ''
  }

  public find = (fsPath: string): string => {
    const fp = this.stripTrailingSlash(fsPath)

    let bestPath: string
    let bestNs: string
    for (const [ns, path] of Object.entries(this.namespaces)) {
      const base = this.stripTrailingSlash(path)
      // prefix match with segment boundary
      if (fp === base || fp.startsWith(base + '/')) {
        if (!bestPath || base.length > bestPath.length) {
          bestPath = base
          bestNs = ns
        }
      }
    }
    return bestNs
  }
  public pathToNamespace(fsPath: string) {
    const ns = this.find(fsPath)
    if (!ns) {
      throw new Error(
        `Could not find valid 'namespace' for folder: ${fsPath} in namespaces: ${JSON.stringify(this.namespaces)}`
      )
    }

    const rootPath = resolve(this.namespaces[ns]) // z.B. "/root/ds-a"
    const componentsDir = join(rootPath, 'components')

    const isExact = fsPath === componentsDir
    const isChild = fsPath.startsWith(componentsDir + sep)
    if (!isExact && !isChild) {
      throw new Error(
        `Could not find 'components' folder in path: ${fsPath}, namespace: ${ns} (${Object.values(this.namespaces).join(', ')})`
      )
    }

    let rel = relative(componentsDir, fsPath) // z.B. "component-a/sub-component-b"

    if (sep !== '/') {
      rel = rel.split(sep).join('/')
    }

    return `@${ns}/${rel}`
  }
}
