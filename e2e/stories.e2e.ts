// Renders every story of the demo dev server on both engines; fails on console
// or page errors, failed requests, a visible error box or an empty render.
import assert from 'node:assert/strict'
import type { ChildProcess } from 'node:child_process'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { chromium, type Browser } from 'playwright'
import {
  ENGINES,
  formatProblems,
  renderStory,
  startStorybook,
  stop,
  storiesOf,
  waitForServer,
} from './helpers.ts'

const PORT = { twig: 6107, twing: 6108 } as const

describe.each(ENGINES)('every story renders on %s', (engine) => {
  let server: ChildProcess | undefined
  let browser: Browser | undefined
  const base = `http://localhost:${PORT[engine]}`

  beforeAll(async () => {
    server = startStorybook(engine, PORT[engine])
    await waitForServer(PORT[engine])
    browser = await chromium.launch()
  })

  afterAll(async () => {
    await browser?.close()
    stop(server)
  })

  test('renders without errors', async () => {
    const stories = await storiesOf(base)
    expect(stories.length).toBeGreaterThan(0)

    assert(browser, 'browser was not launched')
    const page = await browser.newPage({
      viewport: { width: 1200, height: 800 },
    })
    const problems: Array<{ id: string; errors: string[] }> = []
    for (const story of stories) {
      const { errors } = await renderStory(page, base, story.id)
      if (errors.length) problems.push({ id: story.id, errors })
    }
    await page.close()

    expect(
      problems,
      `[${engine}] ${problems.length} of ${stories.length} stories failed:\n${formatProblems(problems)}`
    ).toEqual([])
  })
})
