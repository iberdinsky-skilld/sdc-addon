import type { JSONSchema4 } from 'json-schema'
import { logger } from './logger.ts'
import type { SDCStorybookOptions } from './sdc.d.ts'
import { parse } from 'yaml'
import { readFileSync } from 'node:fs'
import fetch from 'node-fetch'

// Load external definitions (local or remote)
async function loadExternalDef(defPath: string): Promise<Record<string, any>> {
  try {
    if (defPath.startsWith('http://') || defPath.startsWith('https://')) {
      const response = await fetch(defPath)
      if (!response.ok) {
        throw new Error(`Failed to fetch ${defPath}: ${response.statusText}`)
      }
      const content = await response.text()
      return parse(content)
    } else {
      const content = readFileSync(defPath, 'utf8')
      return parse(content)
    }
  } catch (error) {
    logger.error(`Error loading external definition from ${defPath}: ${error}`)
    throw error
  }
}

// Helper to load and merge definitions
export async function loadAndMergeDefinitions(
  externalDefs: SDCStorybookOptions['externalDefs'] | undefined,
  customDefs: SDCStorybookOptions['customDefs'] | undefined
): Promise<JSONSchema4> {
  const globalDefs: JSONSchema4 = {}

  // Load external definitions
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

  // Merge custom definitions
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
