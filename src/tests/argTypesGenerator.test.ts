import { describe, it, expect } from 'vitest'
import generateArgTypes from '../generate/argTypes'
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

  it.each([
    ['sm', 'sm'],
    [false, 'false'],
    [[], '[]'],
  ])('shows default %j as %s in the Default column', (value, summary) => {
    const content: SDCSchema = {
      props: { properties: { size: { type: 'string', default: value } } },
      $defs: {},
      name: '',
    }
    expect(generateArgTypes(content).size?.table?.defaultValue).toEqual({
      summary,
    })
  })

  it('leaves the Default column empty without a default', () => {
    const content: SDCSchema = {
      props: { properties: { size: { type: 'string' } } },
      $defs: {},
      name: '',
    }
    expect(generateArgTypes(content).size?.table).toBeUndefined()
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
