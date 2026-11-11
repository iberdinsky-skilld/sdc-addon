// The CSF module generated for a *.component.yml.
import type { Args, ArgTypes, Globals } from 'storybook/internal/types'
import type { Parameters } from '@storybook/html-vite'
import { jsLiteral } from '../utils.ts'
import type { LocalCssImport } from './libraryAssets.ts'
import type { ExternalAsset } from '../sdc.d.ts'

export interface ComponentModuleInput {
  twigTemplate: string
  iconModule: string
  assetInjector: string
  localAssets: { css: LocalCssImport[]; js: string[] }
  externalAssets: ExternalAsset[]
  componentImports: string
  templateImports: string
  parameters: Parameters
  description: string | undefined
  globals: Globals
  argTypes: ArgTypes
  args: Args
  basicArgs: Args
  stories: string
  slotNames: string[]
  propNames: string[]
}

export const componentModule = ({
  twigTemplate,
  iconModule,
  assetInjector,
  localAssets,
  externalAssets,
  componentImports,
  templateImports,
  parameters,
  description,
  globals,
  argTypes,
  args,
  basicArgs,
  stories,
  slotNames,
  propNames,
}: ComponentModuleInput): string => {
  // Plain local CSS is bundled like the glob CSS.
  const eagerCss = localAssets.css.filter((c) => !c.media)
  // Media-scoped CSS can't be bundled with its query: `?url` + `<link media>`.
  const mediaCss = localAssets.css.filter((c) => c.media)

  const localCssImports = eagerCss.map((c) => `import '${c.path}';`).join('\n')
  const localCssUrlImports = mediaCss
    .map((c, i) => `import _sdcLocalCss${i} from '${c.path}?url';`)
    .join('\n')
  const localMediaAssets = mediaCss
    .map(
      (c, i) =>
        `{ type: 'css', url: _sdcLocalCss${i}, media: ${jsLiteral(c.media)} }`
    )
    .join(', ')

  // One injectAssets call; local media CSS refers to `?url` bindings, so it is
  // not a JSON literal.
  const injectParts = [
    externalAssets.length > 0 ? `...${jsLiteral(externalAssets)}` : '',
    localMediaAssets,
  ].filter(Boolean)
  const assetInjection =
    injectParts.length > 0
      ? `await injectAssets([${injectParts.join(', ')}]);`
      : ''

  // Dynamic imports after injection, so Drupal globals exist first; static
  // imports would hoist above the await.
  const localJsImports = localAssets.js
    .map((p) => `await import('${p}');`)
    .join('\n')

  return `
import COMPONENT from '${twigTemplate}';
void import.meta.glob('./*.css', { eager: true });
${localCssImports}
${localCssUrlImports}
import { injectAssets } from '${assetInjector}';
import { renderIcon as _sdcRenderIcon, twigArgs as _sdcTwigArgs } from '${iconModule}';
${componentImports}
${templateImports}
${assetInjection}
${localJsImports}
await Promise.all(Object.values(import.meta.glob('./*.{js,mjs}')).map(fn => fn()));

export default {
  component: (args) => COMPONENT(_sdcTwigArgs(args, ${jsLiteral(slotNames)}, ${jsLiteral(propNames)})),
  parameters: {
    ...${jsLiteral(parameters, 2)},
    docs: {description: {component: ${jsLiteral(description, 2)}}},
  },
  ${Object.keys(globals).length > 0 ? `globals: ${jsLiteral(globals, 2)},` : ''}
  argTypes: ${jsLiteral(argTypes, 2)},
  args: ${jsLiteral(args, 2)},
};

export const Basic = {
  args: ${jsLiteral(basicArgs, 2)},
  baseArgs: ${jsLiteral(args, 2)},
  play: async ({ canvasElement }) => {
    Drupal.attachBehaviors(canvasElement, window.drupalSettings);
  },
};
${stories}
`
}
