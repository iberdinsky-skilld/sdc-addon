import type { IconPack } from '../sdc.d.ts'

// A complete IconPack with the given fields overridden.
export const makeIconPack = (overrides: Partial<IconPack> = {}): IconPack => ({
  packId: 'pack',
  label: 'Pack',
  extractor: 'path',
  sources: [],
  sourceUrls: [],
  settings: {},
  template: '',
  svgIcons: {},
  pathIcons: {},
  ...overrides,
})
