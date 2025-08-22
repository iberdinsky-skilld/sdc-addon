import { readdirSync, existsSync } from 'fs'
import { join, resolve, sep } from 'path'
import { SDCDesignSystem, SDCDesignSystemConfig } from './sdc'
import type { Alias } from 'vite'
import { config } from 'storybook/actions'

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
  designSystemConfig: DesignSystemConfig
): string | undefined => {
  const baseDir = designSystemConfig.findDesignSystemByNamespace(namespace).path
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
export const toDesignSystemConfig = (
  config: SDCDesignSystemConfig
): DesignSystemConfig => {
  return new DesignSystemConfig(config)
}
class DesignSystemConfig {
  private readonly designSystems: SDCDesignSystem[]
  constructor(config: SDCDesignSystemConfig) {
    this.designSystems = [
      ...[
        {
          path: process.cwd(),
          namespace: config.namespace,
        },
      ],
      ...(config.designSystems ?? []),
    ]
  }

  public toViteAlias(): Alias[] {
    const aliases: Alias[] = []
    this.designSystems.forEach((designSystem) => {
      aliases.push({
        find: '@' + designSystem.namespace,
        replacement: resolve(designSystem.path, 'components').replace(
          /\\/g,
          '/'
        ),
      })
    })
    return aliases
  }
  public toComponentsGlob(glob: string): string[] {
    const folders: string[] = []
    this.designSystems.forEach((designSystem) => {
      folders.push(designSystem.path + sep + 'components' + sep + glob)
    })
    return folders
  }
  public findDesignSystemByNamespace = (namespace: string): SDCDesignSystem => {
    return this.designSystems.find((ds) => namespace === ds.namespace)
  }

  public findDesignSystemByPath = (path: string): SDCDesignSystem => {
    return this.designSystems
      .slice()
      .sort((a, b) => b.path.split('/').length - a.path.split('/').length)
      .find((item) => path.startsWith(item.path))
  }
  public pathToNamespace(path: string) {
    const foundDesignSystem = this.findDesignSystemByPath(path)
    if (foundDesignSystem) {
      const fullPath = resolve(path)
      const componentFolderPath = foundDesignSystem.path + sep + 'components'
      const idx = fullPath.indexOf(componentFolderPath)
      if (idx === -1) {
        throw new Error(
          `Could not find 'components' folder in path: ${fullPath}`
        )
      }
      const relativePath = fullPath.slice(componentFolderPath.length + 1)
      return `@${foundDesignSystem.namespace}/${relativePath}`
    }
    throw new Error(
      `Could not find valid 'externalDesignSystem' for folder: ${path} ${JSON.stringify(this.designSystems)}`
    )
  }
}
