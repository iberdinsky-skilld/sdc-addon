// A subtheme with its base theme outside the Storybook root. Only Twing supports
// this layout for source() (see README, Production static build).
import assert from 'node:assert/strict'
import type { ChildProcess } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import type { Server } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { chromium, type Browser } from 'playwright'
import {
  buildStorybook,
  formatProblems,
  renderStory,
  serveStatic,
  startStorybook,
  stop,
  storiesOf,
  waitForServer,
} from './helpers.ts'

const SUBTHEME = join(import.meta.dirname, 'fixtures/themes/subtheme')
const DEV_PORT = 6118
const STATIC_PORT = 6128

// The svg each story inlines through source(componentMetadata.path ~ ...).
const EXPECTED: Record<string, string[]> = {
  'subtheme-sdc-teaser--basic': ['sub-dot'],
  'subtheme-sdc-teaser--with-card': ['sub-dot', 'base-star'],
  'base-theme-sdc-card--basic': ['base-star'],
}

const checkStories = async (browser: Browser, base: string) => {
  const stories = await storiesOf(base)
  expect(stories.map((s) => s.id).sort()).toEqual(Object.keys(EXPECTED).sort())

  const page = await browser.newPage()
  const problems: Array<{ id: string; errors: string[] }> = []
  for (const { id } of stories) {
    const { html, errors } = await renderStory(page, base, id)
    for (const mark of EXPECTED[id] ?? []) {
      if (!html.includes(`data-test="${mark}"`)) errors.push(`missing ${mark}`)
    }
    if (errors.length) problems.push({ id, errors })
  }
  await page.close()
  return problems
}

describe('base theme outside the project on Twing', () => {
  let browser: Browser | undefined
  let dev: ChildProcess | undefined
  let staticServer: Server | undefined
  const outDir = mkdtempSync(join(tmpdir(), 'sdc-subtheme-'))

  beforeAll(async () => {
    await buildStorybook('twing', outDir, SUBTHEME)
    staticServer = await serveStatic(outDir, STATIC_PORT)
    dev = startStorybook('twing', DEV_PORT, SUBTHEME)
    await waitForServer(DEV_PORT)
    browser = await chromium.launch()
  })

  afterAll(async () => {
    await browser?.close()
    stop(dev)
    staticServer?.close()
    rmSync(outDir, { recursive: true, force: true })
  })

  test.each([
    ['dev server', DEV_PORT],
    ['static build', STATIC_PORT],
  ])('%s', async (_mode, port) => {
    assert(browser, 'browser was not launched')
    const problems = await checkStories(browser, `http://localhost:${port}`)
    expect(problems, formatProblems(problems)).toEqual([])
  })
})
