// Renders every story of the demo dev server on both engines; fails on console
// or page errors, a visible error box or an empty render.
import assert from 'node:assert/strict'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { spawn, type ChildProcess } from 'node:child_process'
import { chromium, type Browser, type Page } from 'playwright'

const ENGINES = ['twig', 'twing'] as const
const PORT = { twig: 6107, twing: 6108 } as const
const START_TIMEOUT_MS = 4 * 60 * 1000

// Noise that is not the addon's: placeholder images and missing favicons.
const IGNORED = /favicon|placehold\.co|net::ERR_/

const waitForServer = async (port: number): Promise<void> => {
  const deadline = Date.now() + START_TIMEOUT_MS
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://localhost:${port}/index.json`)
      if (res.ok) return
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error(`Storybook on port ${port} did not start in time`)
}

const startStorybook = (engine: (typeof ENGINES)[number]): ChildProcess =>
  spawn('npx', ['storybook', 'dev', '-p', String(PORT[engine]), '--ci'], {
    env: { ...process.env, SDC_TWIG_LIB: engine, NODE_ENV: 'development' },
    stdio: 'ignore',
    detached: true,
  })

const stop = (child: ChildProcess | undefined): void => {
  if (!child?.pid) return
  try {
    process.kill(-child.pid, 'SIGTERM')
  } catch {
    /* already gone */
  }
}

interface StoryProblem {
  id: string
  errors: string[]
}

const renderStory = async (
  page: Page,
  base: string,
  id: string
): Promise<string[]> => {
  const errors: string[] = []
  const onConsole = (msg: { type(): string; text(): string }) => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`)
  }
  const onPageError = (err: Error) => errors.push(`pageerror: ${err.message}`)
  page.on('console', onConsole)
  page.on('pageerror', onPageError)
  try {
    await page.goto(`${base}/iframe.html?id=${id}&viewMode=story`, {
      waitUntil: 'load',
    })
    await page
      .waitForFunction(
        () => {
          const root = document.querySelector('#storybook-root')
          const box = document.querySelector('.sb-errordisplay')
          const hasContent = (root?.innerHTML.trim().length ?? 0) > 0
          const boxVisible =
            box !== null && getComputedStyle(box).display !== 'none'
          return hasContent || boxVisible
        },
        null,
        { timeout: 20000 }
      )
      .catch(() => {})
    await page.waitForTimeout(300)
    const html = await page
      .$eval('#storybook-root', (el) => el.innerHTML.trim())
      .catch(() => '')
    const box = await page
      .$eval('.sb-errordisplay', (el) =>
        getComputedStyle(el).display === 'none'
          ? ''
          : el.textContent.replace(/\s+/g, ' ').slice(0, 300)
      )
      .catch(() => '')
    if (box) errors.push(`storybook: ${box}`)
    if (!html) errors.push('empty render')
    if (html.includes('_keys=')) errors.push('leaked `_keys` attribute')
  } finally {
    page.off('console', onConsole)
    page.off('pageerror', onPageError)
  }
  return [...new Set(errors.filter((e) => !IGNORED.test(e)))]
}

describe.each(ENGINES)('every story renders on %s', (engine) => {
  let server: ChildProcess | undefined
  let browser: Browser | undefined
  const base = `http://localhost:${PORT[engine]}`

  beforeAll(async () => {
    server = startStorybook(engine)
    await waitForServer(PORT[engine])
    browser = await chromium.launch()
  })

  afterAll(async () => {
    await browser?.close()
    stop(server)
  })

  test('renders without errors', async () => {
    const index = (await (await fetch(`${base}/index.json`)).json()) as {
      entries: Record<string, { id: string; type: string }>
    }
    const stories = Object.values(index.entries).filter(
      (e) => e.type === 'story'
    )
    expect(stories.length).toBeGreaterThan(0)

    assert(browser, 'browser was not launched')
    const page = await browser.newPage({
      viewport: { width: 1200, height: 800 },
    })
    const problems: StoryProblem[] = []
    for (const story of stories) {
      const errors = await renderStory(page, base, story.id)
      if (errors.length) problems.push({ id: story.id, errors })
    }
    await page.close()

    const report = problems
      .map((p) => `${p.id}\n${p.errors.map((e) => `    ${e}`).join('\n')}`)
      .join('\n')
    expect(
      problems,
      `[${engine}] ${problems.length} of ${stories.length} stories failed:\n${report}`
    ).toEqual([])
  })
})
