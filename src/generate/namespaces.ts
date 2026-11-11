import { existsSync } from 'node:fs'
import { basename, join, resolve, sep, relative } from 'node:path'
import { cwd } from 'node:process'
import type {
  NamespaceDefinition,
  VitePluginTwigDrupalOptions,
  VitePluginTwingDrupalOptions,
} from '../sdc.d.ts'
import type { Alias } from 'vite'
import { normalizePath } from 'vite'
import { logger } from '../logger.ts'
import { listDir } from '../utils.ts'

export const getProjectName = (p: string): string => {
  const fullPath = resolve(p)
  const parts = fullPath.split(sep)
  const project = parts[parts.lastIndexOf('components') - 1]
  if (!project) {
    throw new Error(`Could not find 'components' folder in path: ${fullPath}`)
  }
  return project
}

// `namespace:component` → its two parts; undefined for anything else.
export const parseComponentId = (
  componentId: string
): { namespace: string; component: string } | undefined => {
  const match = /^([^:]+):([^:]+)$/.exec(componentId)
  if (!match?.[1] || !match[2]) return undefined
  return { namespace: match[1], component: match[2] }
}

const getAllSubdirectoriesRecursive = (baseDir: string): string[] =>
  listDir(baseDir)
    .filter((entry) => entry.isDirectory)
    .map((entry) => entry.path)

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
  private namespaces: Record<string, string> = {}
  private stripTrailingSlash = (p: string) => p.replace(/\/+$/g, '')

  constructor(namespaceDefinition: NamespaceDefinition) {
    this.namespaces = namespaceDefinition.namespaces ?? {}

    // Explicit namespace, else the cwd directory name (the Drupal theme case).
    if (namespaceDefinition.namespace) {
      this.namespaces[namespaceDefinition.namespace] = cwd()
    } else {
      this.namespaces[basename(cwd())] = cwd()
    }

    logger.info(`REGISTER NAMESPACES: ${JSON.stringify(this.namespaces)}`)
  }

  // The namespace's components/ dir when present, else the root itself.
  private componentsRoot(path: string): string {
    const componentsPath = join(path, 'components')
    return existsSync(componentsPath) ? componentsPath : path
  }

  public toViteAlias(): Alias[] {
    const aliases: Alias[] = this.entries().map(([namespace, path]) => ({
      find: '@' + namespace,
      replacement: normalizePath(this.componentsRoot(path)),
    }))
    logger.info(`REGISTER VITE ALIASES: ${JSON.stringify(aliases)}`)
    return aliases
  }

  public toTwigJsNamespaces(): VitePluginTwigDrupalOptions['namespaces'] {
    return Object.fromEntries(
      this.entries().map(([ns, path]) => [ns, this.componentsRoot(path)])
    )
  }

  public toTwingNamespaces(): VitePluginTwingDrupalOptions['namespaces'] {
    return Object.fromEntries(
      this.entries().map(([ns, path]) => [ns, [this.componentsRoot(path)]])
    )
  }

  public entries(): [string, string][] {
    return Object.entries(this.namespaces)
  }

  public findPath = (namespace: string): string => {
    return this.namespaces[namespace] || ''
  }

  public find = (fsPath: string): string => {
    const fp = this.stripTrailingSlash(fsPath)

    let bestPath = ''
    let bestNs = ''
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
    const root = this.namespaces[ns]
    if (!ns || root === undefined) {
      throw new Error(
        `Could not find valid 'namespace' for folder: ${fsPath} in namespaces: ${JSON.stringify(this.namespaces)}`
      )
    }

    const rootPath = resolve(root)
    const componentsDir = join(rootPath, 'components')

    if (existsSync(componentsDir)) {
      const isExact = fsPath === componentsDir
      const isChild = fsPath.startsWith(componentsDir + sep)
      if (!isExact && !isChild) {
        throw new Error(
          `Could not find 'components' folder in path: ${fsPath}, namespace: ${ns} (${Object.values(this.namespaces).join(', ')})`
        )
      }

      let rel = relative(componentsDir, fsPath)

      if (sep !== '/') {
        rel = rel.split(sep).join('/')
      }

      if (makeComponentIdFormat) {
        return `${ns}:${rel}`
      }

      return `@${ns}/${rel}`
    }

    return `@${ns}`
  }
}

// Read-only views of the registry.
export type NamespaceRoots = Pick<Namespaces, 'entries'>
export type TwingNamespaceRoots = Pick<
  Namespaces,
  'entries' | 'toTwingNamespaces'
>

export const toNamespaces = (
  namespaceDefinition: NamespaceDefinition
): Namespaces => {
  return new Namespaces(namespaceDefinition)
}
