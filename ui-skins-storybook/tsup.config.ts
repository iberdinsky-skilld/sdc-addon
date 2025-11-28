import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: [
    'storybook',
    'vite',
    'glob',
    'yaml',
    'node:fs/promises',
    'node:path'
  ],
  esbuildOptions(options) {
    options.banner = {
      js: '"use client"'
    }
  }
})
