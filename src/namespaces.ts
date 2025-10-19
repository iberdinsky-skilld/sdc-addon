import { readdirSync, existsSync } from 'node:fs'
import { basename, join, resolve, sep, relative } from 'node:path'
import { cwd } from 'node:process'
import type {
  NamespaceDefinition,
  VitePluginTwigDrupalOptions,
  VitePluginTwingDrupalOptions,
} from './sdc.d.ts'
import type { Alias } from 'vite'
import { normalizePath } from 'vite'
import { logger } from './logger.ts'

const getSubdirectories = (baseDir: string): string[] =>
  readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(baseDir, entry.name))

export const getProjectName = (p: string): string => {
  const fullPath = resolve(p)
  const parts = fullPath.split(sep)
  const i = parts.lastIndexOf('components')
  if (i < 1) {
    throw new Error(`Could not find 'components' folder in path: ${fullPath}`)
  }
  return parts[i - 1]
}

const getAllSubdirectoriesRecursive = (baseDir: string): string[] => {
  const result: string[] = []

  const scan = (dir: string): void => {
    try {
      const entries = readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const fullPath = join(dir, entry.name)
          result.push(fullPath)
          scan(fullPath)
        }
      }
    } catch (error) {
      // Ignore directory access errors
    }
  }

  scan(baseDir)
  return result
}

export const resolveComponentPath = (
  namespace: string,
  component: string,
  namespaces: Namespaces
): string | undefined => {
  const baseDir = namespaces.findPath(namespace)
  if (!baseDir) return undefined

  const componentFileName = `${component}.component.yml`

  const directPath = join(baseDir, 'components', component, componentFileName)
  if (existsSync(directPath)) return directPath

  const componentsDir = join(baseDir, 'components')
  const directories = [
    componentsDir,
    ...getAllSubdirectoriesRecursive(componentsDir),
  ]

  for (const dir of directories) {
    const possiblePath = join(dir, component, componentFileName)
    if (existsSync(possiblePath)) return possiblePath
  }

  return undefined
}

export class Namespaces {
  private namespaces?: Record<string, string>
  private stripTrailingSlash = (p: string) => p.replace(/\/+$/g, '')

  constructor(namespaceDefinition: NamespaceDefinition) {
    this.namespaces = namespaceDefinition.namespaces ?? {}

    // If a namespace option is provided, use it;
    // otherwise, use the current directory name as the namespace.
    // Common case in Drupal themes.
    if (namespaceDefinition.namespace) {
      this.namespaces[namespaceDefinition.namespace] = cwd()
    } else {
      this.namespaces[basename(cwd())] = cwd()
    }

    logger.info(`REGISTER NAMESPACES: ${JSON.stringify(this.namespaces)}`)
  }

  public toViteAlias(): Alias[] {
    const aliases: Alias[] = []

    Object.entries(this.namespaces).forEach(([namespace, path]) => {
      const hasComponents = existsSync(join(path, 'components'))
      aliases.push({
        find: '@' + namespace,
        replacement: normalizePath(
          hasComponents ? join(path, 'components') : path
        ),
      })
    })

    logger.info(`REGISTER VITE ALIASES: ${JSON.stringify(aliases)}`)
    return aliases
  }

  public toTwigJsNamespaces(): VitePluginTwigDrupalOptions['namespaces'] {
    let namespaces: VitePluginTwigDrupalOptions['namespaces'] = {}
    for (const [ns, path] of Object.entries(this.namespaces)) {
      const componentsPath = join(path, 'components')
      if (existsSync(componentsPath)) {
        namespaces[ns] = componentsPath
      } else {
        // Allow non-components namespaces.
        namespaces[ns] = path
      }
    }
    return namespaces
  }

  public toTwingNamespaces(): VitePluginTwingDrupalOptions['namespaces'] {
    let namespaces: VitePluginTwingDrupalOptions['namespaces'] = {}
    for (const [ns, path] of Object.entries(this.namespaces)) {
      const componentsPath = join(path, 'components')
      if (existsSync(componentsPath)) {
        namespaces[ns] = [componentsPath]
      } else {
        // Allow non-components namespaces.
        namespaces[ns] = [path]
      }
    }
    return namespaces
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

  public pathToNamespace(
    fsPath: string,
    makeComponentIdFormat = false
  ): string {
    const ns = this.find(fsPath)
    if (!ns) {
      throw new Error(
        `Could not find valid 'namespace' for folder: ${fsPath} in namespaces: ${JSON.stringify(this.namespaces)}`
      )
    }

    const rootPath = resolve(this.namespaces[ns]) // z.B. "/root/ds-a"
    const componentsDir = join(rootPath, 'components')

    if (existsSync(componentsDir)) {
      // Standard Drupal 'components' structure
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

      if (makeComponentIdFormat) {
        return `${ns}:${rel}`
      }

      return `@${ns}/${rel}`
    }

    // Custom namespace (icons, utilities, etc.)
    return `@${ns}`
  }
}

export const toNamespaces = (
  namespaceDefinition: NamespaceDefinition
): Namespaces => {
  return new Namespaces(namespaceDefinition ?? {})
}
