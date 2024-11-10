import { parse } from 'yaml'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { SDCSchema } from './sdc'

// TODO: Research https://github.com/APIDevTools/json-schema-ref-parser
interface CustomDefSchema {
  [key: string]: any
}

const customDefs: CustomDefSchema = parse(
  readFileSync(resolve(__dirname, 'uiPatternsSchema.yml'), 'utf8')
)


export default (schema: SDCSchema): SDCSchema => {
  return { $defs: customDefs, ...schema }
}
