import { describe, it, expect, vi } from 'vitest'
import generateStorybookArgs from '../argsGenerator'
import type { SDCSchema } from '../sdc.d.ts'

describe('generateStorybookArgs', () => {
  it('should generate arguments from properties', () => {
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
    const args = generateStorybookArgs(content, jsonSchemaFakerOptions)
    expect(args).toHaveProperty('title')
  })

  it('should generate arguments from slots', () => {
    const content: SDCSchema = {
      slots: {
        slot1: { title: 'slot1' },
      },
      $defs: {},
      name: '',
    }

    const jsonSchemaFakerOptions = {}
    const args = generateStorybookArgs(content, jsonSchemaFakerOptions)
    expect(args).toHaveProperty('slot1')
  })

  it('should handle both properties and slots', () => {
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
    const args = generateStorybookArgs(content, jsonSchemaFakerOptions)
    expect(args).toHaveProperty('title')
    expect(args).toHaveProperty('slot1')
  })
})
