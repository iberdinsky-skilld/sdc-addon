import { defineConfig, type Options } from 'tsup'

const NODE_TARGET: Options['target'] = ['node23']

export default defineConfig(async (options) => {
  const commonConfig: Options = {
    // splitting: false,
    // minify: !options.watch,
    // treeshake: true,
    // sourcemap: true,
    // clean: options.watch ? false : true,
    entry: ['src/preset.ts'],
    format: ['esm'],
    target: 'node22',
    platform: 'node',
    outDir: 'dist',
    clean: false,
    shims: true,
    external: ['vite', 'fs', 'vite-plugin-node-polyfills'],
  }

  const configs: Options[] = []

  configs.push({
    ...commonConfig,
    entry: ['src/preset.ts'],
    format: ['esm'],
    target: NODE_TARGET,
    platform: 'node',
  })

  // Browser runtime modules. These are imported into the consumer's Storybook
  // preview bundle (not the node preset), so build them for the browser and keep
  // twing/drupal-attribute external — they must resolve to the consumer's copies
  // (the same singletons the component render uses).
  configs.push({
    entry: ['src/renderer/twing.ts', 'src/renderer/twig.ts'],
    format: ['esm'],
    target: 'es2020',
    platform: 'browser',
    outDir: 'dist/renderer',
    clean: false,
    shims: false,
    splitting: false,
    external: ['twing', 'drupal-attribute'],
  })

  return configs
})
