import { dirname, relative } from "path"
import { MetadataSchema } from "./sdc"

export default (id: string, content: MetadataSchema) => {
  return {
    path: relative(process.cwd(), dirname(id)),
    machineName: id,
    status: content.status || 'stable',
    name: content.name,
    group: content.group || 'All Components',
  }
}