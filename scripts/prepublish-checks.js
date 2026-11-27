#!/usr/bin/env zx

import boxen from 'boxen'
import dedent from 'dedent'
import { readFile } from 'node:fs/promises'
import { globalPackages as globalManagerPackages } from 'storybook/internal/manager/globals'
import { globalPackages as globalPreviewPackages } from 'storybook/internal/preview/globals'

const packageJson = await readFile('./package.json', 'utf8').then(JSON.parse)

let exitCode = 0
$.verbose = false

/**
 * Releases are cut from main: on any other branch `auto shipit` publishes a
 * canary version instead.
 */
const branch = (await $`git branch --show-current`).stdout.trim()
if (branch !== 'main') {
  console.error(
    boxen(
      dedent`
      ${chalk.red.bold('Not on main')}

      ${chalk.red(dedent`Releases are made from main, this is ${chalk.bold(branch || 'a detached HEAD')}.
      Run: git switch main && git pull`)}`,
      { padding: 1, borderColor: 'red' }
    )
  )

  exitCode = 1
}

/**
 * Check that globalized packages are not incorrectly listed as peer dependencies
 */
const peerDependencies = Object.keys(packageJson.peerDependencies || {})
const globalPackages = [...globalManagerPackages, ...globalPreviewPackages]
peerDependencies.forEach((dependency) => {
  if (globalPackages.includes(dependency)) {
    console.error(
      boxen(
        dedent`
          ${chalk.red.bold('Unnecessary peer dependency')}
  
          ${chalk.red(dedent`You have a peer dependency on ${chalk.bold(dependency)} which is most likely unnecessary
          as that is provided by Storybook directly.
          If you are absolutely sure you are doing it correct, you should remove this check from scripts/prepublish-checks.js.`)}
        `,
        { padding: 1, borderColor: 'red' }
      )
    )

    exitCode = 1
  }
})

process.exit(exitCode)
