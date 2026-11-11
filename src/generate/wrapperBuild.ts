import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createWrapperEnv, type WrapperEnv } from '../renderer/wrapper.ts'
import { discoverIconPacks } from './iconPacks.ts'
import type { NamespaceRoots, Namespaces } from './namespaces.ts'
import { listDir } from '../utils.ts'
import Twig from 'twig'
import type {
  SDCStorybookOptions,
  ResolveIconSource,
  StoryDefinition,
  VitePluginTwigDrupalOptions,
  VitePluginTwingDrupalOptions,
} from '../sdc.d.ts'

// The twig plugin options the build-time wrapper renderer replays.
export interface WrapperInitOptions {
  vitePluginTwingDrupalOptions?:
    Pick<VitePluginTwingDrupalOptions, 'hooks'> | undefined
  vitePluginTwigDrupalOptions?:
    Pick<VitePluginTwigDrupalOptions, 'functions'> | undefined
}

// Every namespace's .twig/.svg templates keyed `@ns/rel`, like the browser
// loader.
export function collectTemplates(
  namespaces: NamespaceRoots
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [ns, root] of namespaces.entries()) {
    const componentsRoot = join(root, 'components')
    const base = existsSync(componentsRoot) ? componentsRoot : root
    for (const entry of listDir(base)) {
      if (entry.isDirectory) continue
      if (/\.twig$/.test(entry.name) || /\.svg/.test(entry.name))
        out[`@${ns}/${entry.relative}`] = readFileSync(entry.path, 'utf8')
    }
  }
  return out
}

async function buildInit(
  twigLib: 'twing' | 'twig',
  options: WrapperInitOptions
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
  // twig.js is a module singleton: the instance the wrapper env renders with.
  return () => {
    for (const register of Object.values(fns)) {
      if (typeof register === 'function') register(Twig)
    }
  }
}

// Wrapper renderer for the active twigLib.
export async function createBuildWrapperEnv(
  namespaces: Namespaces,
  options: SDCStorybookOptions & WrapperInitOptions,
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
  stories: Record<string, StoryDefinition>,
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
