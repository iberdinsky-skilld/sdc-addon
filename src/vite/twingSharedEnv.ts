import { jsLiteral, listDir } from '../utils.ts'
import type { TwingNamespaceRoots } from '../generate/namespaces.ts'

// vite-plugin-twing-drupal >= 1.1.4 shares one environment in this module.
export const TWING_ENV_ID = 'virtual:twing-env'
const TWING_ENV_LOADER_LINE =
  'const loader = createSDCLoader(allSources, twingNamespaces);'

// That module registers a template's absolute key only once the template's own
// module loads; alias every absolute path to the plugin's relative key so later
// templates resolve.
export function twingEnvAliases(
  namespaces: TwingNamespaceRoots
): Array<[string, string]> {
  const pairs: Array<[string, string]> = []
  for (const dirs of Object.values(namespaces.toTwingNamespaces() ?? {})) {
    for (const dir of dirs) {
      for (const entry of listDir(dir)) {
        if (entry.isDirectory) continue
        if (!/\.(twig|svg)$/.test(entry.name)) continue
        pairs.push([entry.path, entry.relative])
      }
    }
  }
  return pairs
}

export function injectTwingEnvAliases(
  code: string,
  namespaces: TwingNamespaceRoots
): string {
  if (!code.includes(TWING_ENV_LOADER_LINE)) return code
  const aliasCode = `for (const [abs, rel] of ${jsLiteral(twingEnvAliases(namespaces))}) {
      if (!(abs in allSources) && rel in allSources) allSources[abs] = allSources[rel];
    }
    ${TWING_ENV_LOADER_LINE}`
  return code.replace(TWING_ENV_LOADER_LINE, aliasCode)
}
