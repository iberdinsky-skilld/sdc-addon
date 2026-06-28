import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createWrapperEnv, type WrapperEnv } from '../renderer/wrapper.ts'
import { discoverIconPacks } from './iconPacks.ts'
import type { Namespaces } from './namespaces.ts'
import type { SDCStorybookOptions, ResolveIconSource } from '../sdc.d.ts'

// Collect every namespace's `.twig`/`.svg` templates, keyed `@ns/rel`, walking
// `<path>/components` when it exists else `<path>` (mirrors the browser loader).
function collectTemplates(namespaces: Namespaces): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [ns, root] of namespaces.entries()) {
    const componentsRoot = join(root, 'components')
    const base = existsSync(componentsRoot) ? componentsRoot : root
    const walk = (dir: string, prefix = ''): void => {
      let entries
      try {
        entries = readdirSync(dir, { withFileTypes: true })
      } catch {
        return
      }
      for (const e of entries) {
        const full = join(dir, e.name)
        const rel = prefix ? `${prefix}/${e.name}` : e.name
        if (e.isDirectory()) walk(full, rel)
        else if (/\.twig$/.test(e.name) || /\.svg/.test(e.name))
          out[`@${ns}/${rel}`] = readFileSync(full, 'utf8')
      }
    }
    walk(base)
  }
  return out
}

async function buildInit(
  twigLib: 'twing' | 'twig',
  options: {
    vitePluginTwingDrupalOptions?: { hooks?: string }
    vitePluginTwigDrupalOptions?: { functions?: Record<string, unknown> }
  }
): Promise<((env: unknown) => void) | undefined> {
  if (twigLib === 'twing') {
    const hooks = options.vitePluginTwingDrupalOptions?.hooks
    if (!hooks) return undefined
    const mod = (await import(hooks)) as {
      initEnvironment?: (e: unknown) => void
    }
    return mod.initEnvironment
  }
  const fns = options.vitePluginTwigDrupalOptions?.functions
  if (!fns) return undefined
  return (Twig: unknown) => {
    for (const register of Object.values(fns)) {
      if (typeof register === 'function') register(Twig)
    }
  }
}

// Wrapper renderer for the active twigLib, wired with the namespace loaders,
// Drupal extensions, init hooks and icon packs.
export async function createBuildWrapperEnv(
  namespaces: Namespaces,
  options: SDCStorybookOptions & {
    vitePluginTwingDrupalOptions?: { hooks?: string }
    vitePluginTwigDrupalOptions?: { functions?: Record<string, unknown> }
  },
  resolveIconSource?: ResolveIconSource
): Promise<WrapperEnv> {
  const twigLib = options.twigLib === 'twing' ? 'twing' : 'twig'
  const namespacesMap: Record<string, string[]> = {}
  for (const [ns, root] of namespaces.entries())
    namespacesMap[ns] = [join(root, 'components')]
  return createWrapperEnv(twigLib, {
    templates: collectTemplates(namespaces),
    namespaces: namespacesMap,
    initEnvironment: await buildInit(twigLib, options),
    iconPacks: discoverIconPacks(namespaces, resolveIconSource),
  })
}

export function renderWrapperStories(
  env: WrapperEnv,
  componentId: string,
  stories: Record<
    string,
    { props?: object; slots?: object; library_wrapper?: string }
  >,
  fakerArgs: Record<string, unknown>
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, story] of Object.entries(stories)) {
    if (!story.library_wrapper) continue
    const slotKeys = new Set(Object.keys(story.slots ?? {}))
    const merged: Record<string, unknown> = {
      ...fakerArgs,
      ...(story.props ?? {}),
      ...(story.slots ?? {}),
    }
    delete merged.componentMetadata
    delete merged.defaultAttributes
    const props: Record<string, unknown> = {}
    const slots: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(merged))
      (slotKeys.has(k) ? slots : props)[k] = v
    try {
      out[key] = env.render(componentId, props, slots, story.library_wrapper)
    } catch {
      /* unrendered stories emit an empty render */
    }
  }
  return out
}
