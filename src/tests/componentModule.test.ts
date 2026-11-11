import { describe, expect, test } from 'vitest'
import {
  componentModule,
  type ComponentModuleInput,
} from '../generate/componentModule.ts'

const input = (
  overrides: Partial<ComponentModuleInput> = {}
): ComponentModuleInput => ({
  twigTemplate: '@umami/card/card.twig',
  iconModule: 'virtual:sdc-twig-runtime:twig',
  assetInjector: 'virtual:sdc-asset-injector',
  localAssets: { css: [], js: [] },
  externalAssets: [],
  componentImports: '',
  templateImports: '',
  parameters: {},
  description: 'A card',
  globals: {},
  argTypes: {},
  args: { title: 'Hi' },
  basicArgs: {},
  stories: 'export const Extra = {}',
  slotNames: ['content'],
  propNames: ['title'],
  ...overrides,
})

describe('componentModule', () => {
  test('imports the template and runtime, exports meta, Basic and stories', () => {
    const code = componentModule(input())
    expect(code).toContain("import COMPONENT from '@umami/card/card.twig';")
    expect(code).toContain(
      'component: (args) => COMPONENT(_sdcTwigArgs(args, ["content"], ["title"])),'
    )
    expect(code).toContain("from 'virtual:sdc-twig-runtime:twig';")
    expect(code).toContain('docs: {description: {component: "A card"}}')
    expect(code).toContain('export const Basic = {')
    expect(code).toContain('export const Extra = {}')
    expect(code).not.toContain('globals:')
    expect(code).not.toContain('await injectAssets(')
  })

  test('emits component globals only when there are some', () => {
    const code = componentModule(input({ globals: { theme: 'dark' } }))
    expect(code).toContain('"theme": "dark"')
  })

  test('bundles plain local CSS and injects media-scoped CSS as a link', () => {
    const code = componentModule(
      input({
        localAssets: {
          css: [
            { path: './styles/base.css' },
            { path: './styles/print.css', media: 'print' },
          ],
          js: [],
        },
      })
    )
    expect(code).toContain("import './styles/base.css';")
    expect(code).toContain(
      "import _sdcLocalCss0 from './styles/print.css?url';"
    )
    expect(code).toContain(
      `await injectAssets([{ type: 'css', url: _sdcLocalCss0, media: "print" }]);`
    )
  })

  test('injects external assets before importing local JS', () => {
    const code = componentModule(
      input({
        externalAssets: [{ type: 'js', url: 'https://cdn.example/lib.js' }],
        localAssets: { css: [], js: ['./js/behavior.js'] },
      })
    )
    const injection = code.indexOf('await injectAssets([')
    const localJs = code.indexOf("await import('./js/behavior.js');")
    expect(code).toContain('"url":"https://cdn.example/lib.js"')
    expect(injection).toBeGreaterThan(-1)
    expect(localJs).toBeGreaterThan(injection)
  })
})
