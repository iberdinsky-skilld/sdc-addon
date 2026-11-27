// Imports of embedded components, so their CSS/JS load too.
import { existsSync, readFileSync } from 'node:fs'
import { logger } from '../logger.ts'
import { isRecord } from '../guards.ts'
import { toIdentifier } from '../utils.ts'
import {
  parseComponentId,
  resolveComponentPath,
  type Namespaces,
} from './namespaces.ts'
import type { ComponentNode, StoryDefinition } from '../sdc.d.ts'

const isComponentNode = (value: unknown): value is ComponentNode =>
  isRecord(value) &&
  value.type === 'component' &&
  typeof value.component === 'string'

// *.component.yml of a `namespace:component` id; warns when it can't resolve.
const resolveComponentId = (
  componentId: string,
  namespaces: Namespaces
): string | undefined => {
  const ref = parseComponentId(componentId)
  if (!ref) {
    logger.warn(
      `Component id "${componentId}" must be "namespace:component" to be embedded in a story`
    )
    return undefined
  }
  const path = resolveComponentPath(ref.namespace, ref.component, namespaces)
  if (!path) logger.warn(`Component "${componentId}" was not found`)
  return path
}

// `import * as <id>` for every component node in the stories, at any depth.
export const storyComponentImports = (
  stories: Record<string, StoryDefinition>,
  namespaces: Namespaces
): string => {
  const imports = new Set<string>()

  const walk = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(walk)
      return
    }
    if (!isRecord(value)) return
    if (isComponentNode(value)) {
      const resolvedPath = resolveComponentId(value.component, namespaces)
      if (resolvedPath) {
        imports.add(
          `import * as ${toIdentifier(value.component)} from '${resolvedPath}';`
        )
      }
    }
    Object.values(value).forEach(walk)
  }

  for (const { slots = {}, props = {} } of Object.values(stories)) {
    walk({ ...slots, ...props })
  }
  return Array.from(imports).join('\n')
}

// Imports of the components a template includes, embeds or extends.
export const twigDependencyImports = (
  twigFilePath: string,
  namespaces: Namespaces
): string =>
  existsSync(twigFilePath)
    ? templateDependencies(readFileSync(twigFilePath, 'utf8'), namespaces)
        .map((path) => `import '${path}';`)
        .join('\n')
    : ''

// *.component.yml of every `ns:component` that Twig source includes, embeds
// or extends, with the tags or include().
export const templateDependencies = (
  twigContent: string,
  namespaces: Namespaces
): string[] => {
  const paths = new Set<string>()
  const patterns = [
    /{%-?\s*(?:include|embed|extends)\s+['"]([a-zA-Z0-9_-]+:[a-zA-Z0-9_/-]+)['"]/g,
    /\binclude\(\s*['"]([a-zA-Z0-9_-]+:[a-zA-Z0-9_/-]+)['"]/g,
  ]
  for (const [, componentId] of patterns.flatMap((pattern) => [
    ...twigContent.matchAll(pattern),
  ])) {
    const resolvedPath =
      componentId && resolveComponentId(componentId, namespaces)
    if (resolvedPath) paths.add(resolvedPath)
  }
  return [...paths]
}
