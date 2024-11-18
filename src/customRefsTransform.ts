import { parse } from 'yaml'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { SDCSchema } from './sdc'

interface CustomDefSchema {
  [key: string]: any
}

/**
 * Load and parse a YAML file.
 * @param filePath Path to the YAML file.
 * @returns Parsed content as an object.
 */
const loadYamlFile = (filePath: string): CustomDefSchema => {
  const resolvedPath = resolve(__dirname, filePath)
  if (!existsSync(resolvedPath)) {
    throw new Error(`File not found: ${resolvedPath}`)
  }

  return parse(readFileSync(resolvedPath, 'utf8'))
}

// Load the primary custom definitions file
const uiPatternsSchema = loadYamlFile('uiPatternsSchema.yml')

// Load an additional custom definitions file
const additionalSchema = loadYamlFile('exBuilderSchema.yml')

// Merge both schemas into customDefs
const customDefs: CustomDefSchema = {
  ...uiPatternsSchema,
  ...additionalSchema,
}

export default (schema: SDCSchema): SDCSchema => {
  return {
    ...schema,
    $defs: {
      ...customDefs,
      ...schema.$defs,
    },
  }
}
