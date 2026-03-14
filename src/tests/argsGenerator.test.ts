import { describe, it, expect, vi } from 'vitest'
import generateStorybookArgs from '../argsGenerator'
import type { SDCSchema } from '../sdc.d.ts'

describe('generateStorybookArgs', () => {
  it('should generate arguments from properties', async () => {
    const content: SDCSchema = {
      props: {
        properties: {
          title: { type: 'string' },
        },
      },
      $defs: {},
      name: '',
    }

    const jsonSchemaFakerOptions = {}
    const args = await generateStorybookArgs(content, jsonSchemaFakerOptions)
    expect(args).toHaveProperty('title')
  })

  it('should generate arguments from slots', async () => {
    const content: SDCSchema = {
      slots: {
        slot1: { title: 'slot1' },
      },
      $defs: {},
      name: '',
    }

    const jsonSchemaFakerOptions = {}
    const args = await generateStorybookArgs(content, jsonSchemaFakerOptions)
    expect(args).toHaveProperty('slot1')
  })

  it('should handle both properties and slots', async () => {
    const content: SDCSchema = {
      props: {
        properties: {
          title: { type: 'string' },
        },
      },
      slots: {
        slot1: { title: 'slot1' },
      },
      $defs: {},
      name: '',
    }

    const jsonSchemaFakerOptions = {}
    const args = await generateStorybookArgs(content, jsonSchemaFakerOptions)
    expect(args).toHaveProperty('title')
    expect(args).toHaveProperty('slot1')
  })

  it('resolves refs from external/custom defs map keys', async () => {
    const content: SDCSchema = {
      props: {
        properties: {
          links: { $ref: 'ui-patterns://links' },
        },
      },
      $defs: {
        'ui-patterns://links': {
          type: 'array',
          items: { type: 'string' },
        },
      },
      name: '',
    }

    const args = await generateStorybookArgs(content, {})
    expect(args).toHaveProperty('links')
    expect(Array.isArray(args.links)).toBe(true)
  })
})
