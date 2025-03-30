import { describe, it, expect } from 'vitest'
import generateArgTypes from '../argTypesGenerator'
import type { SDCSchema } from '../sdc'

describe('generateArgTypes', () => {
  it('should generate argTypes from properties', () => {
    const content: SDCSchema = {
      props: {
        properties: {
          title: { type: 'string' },
          count: { type: 'number' },
          category: { type: 'string', enum: ['A', 'B', 'C'] },
        },
      },
      $defs: {},
      name: '',
    }

    const argTypes = generateArgTypes(content)
    expect(argTypes).toHaveProperty('title')
    expect(argTypes).toHaveProperty('count')
    expect(argTypes).toHaveProperty('category')
    expect(argTypes.category).toHaveProperty('control', 'radio')
    expect(argTypes.category).toHaveProperty('options', ['A', 'B', 'C'])
  })

  it('should return an empty object if no properties are provided', () => {
    const content: SDCSchema = {
      props: {
        properties: {},
      },
      $defs: {},
      name: '',
    }

    const argTypes = generateArgTypes(content)
    expect(argTypes).toEqual({})
  })

  it('should handle missing props', () => {
    const content: SDCSchema = {
      $defs: {},
      name: '',
    }

    const argTypes = generateArgTypes(content)
    expect(argTypes).toEqual({})
  })
})
