// Reading a component's *.component.yml and its *.story.yml files.
import { readFileSync } from 'node:fs'
import { basename, dirname } from 'node:path'
import { parse as parseYaml } from 'yaml'
import type { JSONSchema4 } from 'json-schema'
import { logger } from '../logger.ts'
import { isRecord } from '../guards.ts'
import { listDir, posixDirname, sanitizeStoryKey } from '../utils.ts'
import { schemaUrlFor, validateJson } from './validate.ts'
import type { SDCSchema, StoryDefinition } from '../sdc.d.ts'

// Validation only warns, so a bad schema never hides a component.
export const readSDC = async (
  filePath: string,
  defs?: Record<string, JSONSchema4>,
  validate?: string | boolean
): Promise<SDCSchema> => {
  const sdcSchema: SDCSchema = {
    ...(defs ? { $defs: defs } : {}),
    ...(parseYaml(readFileSync(filePath, 'utf8')) as SDCSchema),
  }
  const schemaUrl = schemaUrlFor(sdcSchema, validate)
  if (schemaUrl) {
    try {
      await validateJson(sdcSchema, schemaUrl)
    } catch (error) {
      logger.warn(`Could not validate ${filePath}: ${String(error)}`)
    }
  }
  return sdcSchema
}

// *.story.yml files of a component folder at any depth, skipping subfolders
// that hold their own component.
export const collectStoryFilesSync = (rootDir: string): string[] => {
  const files = listDir(rootDir).filter((entry) => !entry.isDirectory)
  const foreign = files
    .filter(
      (entry) =>
        entry.name.endsWith('.component.yml') && entry.relative.includes('/')
    )
    .map((entry) => posixDirname(entry.relative) + '/')
  return files
    .filter(
      (entry) =>
        entry.name.endsWith('.story.yml') &&
        !foreign.some((dir) => entry.relative.startsWith(dir))
    )
    .map((entry) => entry.path)
}

// Stories keyed by `<story>` in `<component>.<story>.story.yml`.
export const loadStoryFilesSync = (
  fileName: string
): Record<string, StoryDefinition> => {
  const folderPath = dirname(fileName)
  const storyFiles = collectStoryFilesSync(folderPath)

  const stories: Record<string, StoryDefinition> = {}
  for (const file of storyFiles) {
    const key = sanitizeStoryKey(basename(file).split('.')[1] ?? '')
    if (Object.prototype.hasOwnProperty.call(stories, key)) {
      logger.warn(
        `Duplicate story key "${key}" from ${file} overrides an earlier story while indexing ${fileName}`
      )
    }
    const story: unknown = parseYaml(readFileSync(file, 'utf8'))
    if (!isRecord(story)) {
      logger.warn(`${file} is not a story definition (expected a mapping)`)
      continue
    }
    stories[key] = story
  }
  return stories
}
