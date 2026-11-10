// End-to-end run: starts the demo Storybook on each Twig engine and renders
// every story in a real browser. Needs `npx playwright install chromium`.
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['e2e/**/*.e2e.ts'],
    environment: 'node',
    testTimeout: 10 * 60 * 1000,
    hookTimeout: 5 * 60 * 1000,
    fileParallelism: false,
  },
})
