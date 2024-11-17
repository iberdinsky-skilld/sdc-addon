import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'

copyFileSync(
  resolve(__dirname, '../drupal-defs/uiPatternsSchema.yml'),
  resolve(__dirname, '../dist/uiPatternsSchema.yml')
)

copyFileSync(
  resolve(__dirname, '../drupal-defs/exBuilderSchema.yml'),
  resolve(__dirname, '../dist/exBuilderSchema.yml')
)
