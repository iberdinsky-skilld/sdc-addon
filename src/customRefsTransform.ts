import { parse } from 'yaml'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { MetadataSchema } from './sdc'

// TODO: Research https://github.com/APIDevTools/json-schema-ref-parser
interface CustomDefSchema {
  [key: string]: any
}

const customDefs: CustomDefSchema = parse(
  readFileSync(resolve(__dirname, 'uiPatternsSchema.yml'), 'utf8')
)


export default (schema: MetadataSchema): MetadataSchema => {
  return { $defs: customDefs, ...schema }
}
