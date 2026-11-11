import assert from 'node:assert/strict'
import { describe, it, expect } from 'vitest'
import { isRecord } from '../guards.ts'
import generateStorybookArgs, { toFakerSchema } from '../generate/args'
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

  describe('object handling for different JSON schema types', () => {
    it('keeps type:array as an array (not flattened via Object.values)', async () => {
      const content: SDCSchema = {
        props: {
          properties: {
            tags: { type: 'array', items: { type: 'string' } },
          },
        },
        $defs: {},
        name: '',
      }

      const args = await generateStorybookArgs(content, {})
      expect(Array.isArray(args.tags)).toBe(true)
    })

    it('keeps type:object as a plain object (not converted to array of values)', async () => {
      const content: SDCSchema = {
        props: {
          properties: {
            config: {
              type: 'object',
              properties: {
                label: { type: 'string' },
                count: { type: 'integer' },
              },
            },
          },
        },
        $defs: {},
        name: '',
      }

      const { config }: { config?: unknown } = await generateStorybookArgs(
        content,
        {}
      )
      assert(isRecord(config))
      // The faker may generate a subset of the properties.
      const keys = Object.keys(config)
      expect(keys.every((k) => ['label', 'count'].includes(k))).toBe(true)
    })

    it('keeps type:string as a primitive string', async () => {
      const content: SDCSchema = {
        props: {
          properties: {
            title: { type: 'string' },
          },
        },
        $defs: {},
        name: '',
      }

      const args = await generateStorybookArgs(content, {})
      expect(typeof args.title).toBe('string')
    })

    it('keeps type:integer as a primitive number', async () => {
      const content: SDCSchema = {
        props: {
          properties: {
            count: { type: 'integer' },
          },
        },
        $defs: {},
        name: '',
      }

      const args = await generateStorybookArgs(content, {})
      expect(typeof args.count).toBe('number')
    })

    it('keeps type:boolean as a primitive boolean', async () => {
      const content: SDCSchema = {
        props: {
          properties: {
            active: { type: 'boolean' },
          },
        },
        $defs: {},
        name: '',
      }

      const args = await generateStorybookArgs(content, {})
      expect(typeof args.active).toBe('boolean')
    })

    it('keeps type:array with object items as array of objects', async () => {
      const content: SDCSchema = {
        props: {
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  name: { type: 'string' },
                },
              },
            },
          },
        },
        $defs: {},
        name: '',
      }

      const { items }: { items?: unknown } = await generateStorybookArgs(
        content,
        {}
      )
      assert(Array.isArray(items))
      if (items.length > 0) {
        expect(items[0]).toBeInstanceOf(Object)
        expect(Array.isArray(items[0])).toBe(false)
      }
    })

    it('keeps type:object with examples as a plain object (nested object property)', async () => {
      const content: SDCSchema = {
        props: {
          properties: {
            identifier: {
              type: 'string',
              title: 'Identifier',
              examples: ['123456'],
            },
            address: {
              type: 'object',
              title: 'Address',
              examples: [
                {
                  street: 'Example Street 1',
                  postalCode: 8000,
                  city: 'City',
                  country: 'Country',
                },
              ],
            },
          },
        },
        $defs: {},
        name: '',
      }

      const args = await generateStorybookArgs(content, {})
      expect(typeof args.identifier).toBe('string')
      // must remain a plain object, not an array of its values
      expect(Array.isArray(args.address)).toBe(false)
      expect(args.address).toBeInstanceOf(Object)
    })

    it('useDefaultValue takes precedence over enum when default is defined', async () => {
      const content: SDCSchema = {
        props: {
          properties: {
            heading_level: {
              type: 'string',
              enum: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
              default: 'h2',
            },
          },
        },
        $defs: {},
        name: '',
      }

      const args = await generateStorybookArgs(content, {
        useDefaultValue: true,
      })
      expect(args.heading_level).toBe('h2')
    })

    it('converts a non-object-typed schema that generates an object via Object.values', async () => {
      // An enum with an object value and no `type: object`: the picked object is
      // flattened to its values.
      const content: SDCSchema = {
        props: {
          properties: {
            option: {
              enum: [{ value: 'a', label: 'A' }],
            },
          },
        },
        $defs: {},
        name: '',
      }

      const args = await generateStorybookArgs(content, {})
      // Without explicit type:'object', the object is flattened to its values
      expect(Array.isArray(args.option)).toBe(true)
      expect(args.option).toEqual(['a', 'A'])
    })
  })

  describe('draft-04 schemas', () => {
    it('honours boolean exclusiveMinimum/exclusiveMaximum', async () => {
      const content: SDCSchema = {
        name: '',
        props: {
          properties: {
            n: {
              type: 'integer',
              minimum: 5,
              maximum: 6,
              exclusiveMinimum: true,
            },
            m: {
              type: 'integer',
              minimum: 5,
              maximum: 6,
              exclusiveMaximum: true,
            },
          },
        },
      }
      const args = await generateStorybookArgs(content, {})
      expect(args.n).toBe(6)
      expect(args.m).toBe(5)
    })

    it('generates tuple items positionally', async () => {
      const content: SDCSchema = {
        name: '',
        props: {
          properties: {
            pair: {
              type: 'array',
              items: [{ type: 'string' }, { type: 'integer' }],
              minItems: 2,
              maxItems: 2,
            },
          },
        },
      }
      const { pair }: { pair?: unknown } = await generateStorybookArgs(
        content,
        {}
      )
      assert(Array.isArray(pair))
      expect(pair).toHaveLength(2)
      expect(typeof pair[0]).toBe('string')
      expect(typeof pair[1]).toBe('number')
    })

    it('converts $defs referenced from props', async () => {
      const content: SDCSchema = {
        name: '',
        props: { properties: { n: { $ref: 'x://bounded' } } },
        $defs: {
          'x://bounded': {
            type: 'integer',
            minimum: 5,
            maximum: 6,
            exclusiveMinimum: true,
          },
        },
      }
      const args = await generateStorybookArgs(content, {})
      expect(args.n).toBe(6)
    })
  })

  describe('toFakerSchema', () => {
    it('drops a false exclusive flag and keeps the bound', () => {
      expect(toFakerSchema({ minimum: 1, exclusiveMinimum: false })).toEqual({
        minimum: 1,
      })
    })

    it('maps tuple items plus additionalItems onto prefixItems/items', () => {
      expect(
        toFakerSchema({
          items: [{ type: 'string' }],
          additionalItems: { type: 'number' },
        })
      ).toEqual({
        prefixItems: [{ type: 'string' }],
        items: { type: 'number' },
      })
      expect(
        toFakerSchema({ items: [{ type: 'string' }], additionalItems: false })
      ).toEqual({ prefixItems: [{ type: 'string' }], items: false })
    })

    it('walks nested schema keywords but not data', () => {
      const out = toFakerSchema({
        properties: {
          a: { minimum: 1, exclusiveMinimum: true },
        },
        patternProperties: { '^x': { maximum: 2, exclusiveMaximum: true } },
        definitions: { d: { items: { minimum: 0, exclusiveMinimum: true } } },
        dependencies: { a: ['b'], b: { minimum: 3, exclusiveMinimum: true } },
        allOf: [{ minimum: 4, exclusiveMinimum: true }],
        anyOf: [{ minimum: 5, exclusiveMinimum: true }],
        oneOf: [{ minimum: 6, exclusiveMinimum: true }],
        not: { minimum: 7, exclusiveMinimum: true },
        additionalProperties: { minimum: 8, exclusiveMinimum: true },
        enum: [{ minimum: 9, exclusiveMinimum: true }],
        default: { minimum: 10, exclusiveMinimum: true },
      })
      expect(out).toEqual({
        properties: { a: { exclusiveMinimum: 1 } },
        patternProperties: { '^x': { exclusiveMaximum: 2 } },
        definitions: { d: { items: { exclusiveMinimum: 0 } } },
        dependencies: { a: ['b'], b: { exclusiveMinimum: 3 } },
        allOf: [{ exclusiveMinimum: 4 }],
        anyOf: [{ exclusiveMinimum: 5 }],
        oneOf: [{ exclusiveMinimum: 6 }],
        not: { exclusiveMinimum: 7 },
        additionalProperties: { exclusiveMinimum: 8 },
        enum: [{ minimum: 9, exclusiveMinimum: true }],
        default: { minimum: 10, exclusiveMinimum: true },
      })
    })
  })
})
