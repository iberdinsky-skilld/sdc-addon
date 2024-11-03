import { parse } from 'yaml'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { MetadataSchema } from './sdc'

// TODO: Research https://github.com/APIDevTools/json-schema-ref-parser
interface CustomRefSchema {
  [key: string]: any
}

const customRefs: CustomRefSchema = parse(
  readFileSync(resolve(__dirname, 'uiPatternsSchema.yml'), 'utf8')
)

const memo = new Map<object, object>()

function resolveRef(ref: string): CustomRefSchema | undefined {
  return customRefs[ref.toString()]
}

function processObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj
  }

  if (memo.has(obj)) {
    return memo.get(obj)
  }

  for (const key in obj) {
    const value = obj[key]

    if (key === '$ref' && typeof value === 'string') {
      const resolvedRef = resolveRef(value)
      if (!resolvedRef) {
        throw new Error(`Reference "${value}" not found in custom schema`)
      }

      const processedRef = processObject(resolvedRef)
      Object.assign(obj, processedRef)

      delete obj[key]
    } else if (typeof value === 'object') {
      processObject(value)
    }
  }

  memo.set(obj, { ...obj })
  return obj
}

export default (schema: MetadataSchema): MetadataSchema => {
  return processObject(schema)
}
