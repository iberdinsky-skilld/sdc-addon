import type { JSONSchema4 } from 'json-schema'
import { logger } from '../logger.ts'
import { isRemoteUrl } from '../utils.ts'
import { isRecord } from '../guards.ts'
import type { SDCStorybookOptions } from '../sdc.d.ts'
import { parse } from 'yaml'
import { readFileSync } from 'node:fs'

// Entries that are not objects cannot be schemas and are dropped.
async function loadExternalDef(
  defPath: string
): Promise<Record<string, JSONSchema4>> {
  try {
    let content: string
    if (isRemoteUrl(defPath)) {
      const response = await fetch(defPath)
      if (!response.ok) {
        throw new Error(`Failed to fetch ${defPath}: ${response.statusText}`)
      }
      content = await response.text()
    } else {
      content = readFileSync(defPath, 'utf8')
    }
    const defs: unknown = parse(content)
    if (!isRecord(defs)) {
      throw new Error(`Expected a YAML mapping of definitions in ${defPath}`)
    }
    return Object.fromEntries(
      Object.entries(defs).filter(
        (entry): entry is [string, Record<string, unknown>] =>
          isRecord(entry[1])
      )
    )
  } catch (error) {
    logger.error(
      `Error loading external definition from ${defPath}: ${String(error)}`
    )
    throw error
  }
}

export async function loadAndMergeDefinitions(
  externalDefs: SDCStorybookOptions['externalDefs'] | undefined,
  customDefs: SDCStorybookOptions['customDefs'] | undefined
): Promise<Record<string, JSONSchema4>> {
  const globalDefs: Record<string, JSONSchema4> = {}

  if (externalDefs) {
    await Promise.all(
      externalDefs.map(async (defPath) => {
        const def = await loadExternalDef(defPath)
        Object.entries(def).forEach(([component, schema]) => {
          globalDefs[component] = schema
        })
      })
    )
  }

  if (customDefs) {
    Object.entries(customDefs).forEach(([component, schema]) => {
      globalDefs[component] = schema
    })
  }

  if (Object.keys(globalDefs).length > 0) {
    logger.info(
      `REGISTER CUSTOM DEFINITIONS ${JSON.stringify(Object.keys(globalDefs))}`
    )
  }

  return globalDefs
}
