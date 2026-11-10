import { basename, dirname, relative } from 'node:path'
import type { SDCSchema } from '../sdc.d.ts'
import { cwd } from 'node:process'

// Mirrors the fields of Drupal's ComponentMetadata that templates read.
export interface ComponentMetadata {
  path: string
  // The component's machine name, e.g. `badge` for `umami:badge`.
  machineName: string
  status: string
  name: string
  group: string | undefined
}

export default (id: string, content: SDCSchema): ComponentMetadata => {
  return {
    path: relative(cwd(), dirname(id)),
    machineName: basename(id, '.component.yml'),
    status: content.status || 'stable',
    name: content.name,
    group: content.group,
  }
}
