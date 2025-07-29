import { describe, it, expect, vi } from 'vitest'
import generateStorybookArgs from '../argsGenerator'
import { SDCSchema } from '../sdc'

describe('storiesRenderer', () => {
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
        slot1: { type: 'string' },
      },
      $defs: {},
      name: '',
    }

    const jsonSchemaFakerOptions = {}
    const args = generateStorybookArgs(content, jsonSchemaFakerOptions)
    expect(args).toHaveProperty('slot1')
  })


})
