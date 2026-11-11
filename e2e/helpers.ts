import { spawn, type ChildProcess } from 'node:child_process'
import { createReadStream, statSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import { extname, join, normalize } from 'node:path'
import type { Page } from 'playwright'

export const ENGINES = ['twig', 'twing'] as const
export type Engine = (typeof ENGINES)[number]

const START_TIMEOUT_MS = 4 * 60 * 1000

// Noise that is not the addon's: placeholder images and missing favicons.
const IGNORED = /favicon|placehold\.co|net::ERR_/

export const waitForServer = async (port: number): Promise<void> => {
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

const storybookEnv = (engine: Engine, nodeEnv: string) => ({
  ...process.env,
  SDC_TWIG_LIB: engine,
  NODE_ENV: nodeEnv,
})

export const startStorybook = (
  engine: Engine,
  port: number,
  cwd = process.cwd()
): ChildProcess =>
  spawn('npx', ['storybook', 'dev', '-p', String(port), '--ci'], {
    cwd,
    env: storybookEnv(engine, 'development'),
    stdio: 'ignore',
    detached: true,
  })

export const buildStorybook = (
  engine: Engine,
  outDir: string,
  cwd = process.cwd()
): Promise<void> =>
  new Promise((resolve, reject) => {
    const child = spawn(
      'npx',
      ['storybook', 'build', '-o', outDir, '--quiet'],
      { cwd, env: storybookEnv(engine, 'production'), stdio: 'ignore' }
    )
    child.on('error', reject)
    child.on('exit', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`storybook build exited with ${String(code)}`))
    )
  })

export const stop = (child: ChildProcess | undefined): void => {
  if (!child?.pid) return
  try {
    process.kill(-child.pid, 'SIGTERM')
  } catch {
    /* already gone */
  }
}

const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
}

export const serveStatic = (root: string, port: number): Promise<Server> =>
  new Promise((resolve) => {
    const server = createServer((req, res) => {
      const url = decodeURIComponent((req.url ?? '/').split('?')[0] ?? '/')
      const file = normalize(
        join(root, url.endsWith('/') ? url + 'index.html' : url)
      )
      try {
        if (!file.startsWith(root) || !statSync(file).isFile())
          throw new Error()
        res.writeHead(200, {
          'Content-Type': MIME[extname(file)] ?? 'application/octet-stream',
        })
        createReadStream(file).pipe(res)
      } catch {
        res.writeHead(404).end()
      }
    })
    server.listen(port, () => resolve(server))
  })

export interface StoryIndexEntry {
  id: string
  type: string
}

export const storiesOf = async (base: string): Promise<StoryIndexEntry[]> => {
  const index = (await (await fetch(`${base}/index.json`)).json()) as {
    entries: Record<string, StoryIndexEntry>
  }
  return Object.values(index.entries).filter((e) => e.type === 'story')
}

export interface RenderResult {
  html: string
  errors: string[]
}

export const renderStory = async (
  page: Page,
  base: string,
  id: string
): Promise<RenderResult> => {
  const errors: string[] = []
  const onConsole = (msg: { type(): string; text(): string }) => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`)
  }
  const onPageError = (err: Error) => errors.push(`pageerror: ${err.message}`)
  const onResponse = (res: { status(): number; url(): string }) => {
    if (res.status() >= 400) errors.push(`http ${res.status()} ${res.url()}`)
  }
  page.on('console', onConsole)
  page.on('pageerror', onPageError)
  page.on('response', onResponse)
  let html: string
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
    html = await page
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
    page.off('response', onResponse)
  }
  return { html, errors: [...new Set(errors.filter((e) => !IGNORED.test(e)))] }
}

export const formatProblems = (
  problems: Array<{ id: string; errors: string[] }>
): string =>
  problems
    .map((p) => `${p.id}\n${p.errors.map((e) => `    ${e}`).join('\n')}`)
    .join('\n')
