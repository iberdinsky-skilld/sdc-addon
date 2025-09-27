import { dirname, relative } from 'node:path'
import type { SDCSchema } from './sdc.d.ts'
import { cwd } from 'node:process'

export interface ComponentMetadata {
  path: string
  machineName: string
  status: string
  name: string
  group: string
}

export default (id: string, content: SDCSchema): ComponentMetadata => {
  return {
    path: relative(cwd(), dirname(id)),
    machineName: id,
    status: content.status || 'stable',
    name: content.name,
    group: content.group || 'All Components',
  }
}
