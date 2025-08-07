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
    clean: true,
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

  return configs
})
