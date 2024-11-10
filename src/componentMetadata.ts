import { dirname, relative } from "path"
import { SDCSchema } from "./sdc"

export interface ComponentMetadata {
  path: string
  machineName: string
  status: string
  name: string
  group: string
}

export default (id: string, content: SDCSchema): ComponentMetadata => {
  return {
    path: relative(process.cwd(), dirname(id)),
    machineName: id,
    status: content.status || 'stable',
    name: content.name,
    group: content.group || 'All Components',
  }
}