import { defineConfig } from 'tsup'

export default defineConfig([
  // Storybook preset (Node).
  {
    entry: ['src/preset.ts'],
    format: ['esm'],
    target: 'node22',
    platform: 'node',
    outDir: 'dist',
    clean: false,
    shims: true,
    external: ['vite', 'fs', 'vite-plugin-node-polyfills'],
  },
  // Browser runtime, bundled into the consumer's preview; twing and
  // drupal-attribute stay external to share the consumer's singletons.
  {
    entry: ['src/renderer/twing.ts', 'src/renderer/twig.ts'],
    format: ['esm'],
    target: 'es2020',
    platform: 'browser',
    outDir: 'dist/renderer',
    clean: false,
    shims: false,
    splitting: false,
    external: ['twing', 'drupal-attribute'],
  },
  // Public option types for `.storybook/main.ts`; no runtime code.
  {
    entry: { index: 'src/index.ts' },
    format: ['esm'],
    outDir: 'dist',
    clean: false,
    dts: { only: true },
  },
])
