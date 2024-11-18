import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'

copyFileSync(
  resolve(__dirname, '../src/uiPatternsSchema.yml'),
  resolve(__dirname, '../dist/uiPatternsSchema.yml')
)

copyFileSync(
  resolve(__dirname, '../src/exBuilderSchema.yml'),
  resolve(__dirname, '../dist/exBuilderSchema.yml')
)
