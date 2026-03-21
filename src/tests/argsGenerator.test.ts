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

      const args = await generateStorybookArgs(content, {})
      expect(args.config).toBeInstanceOf(Object)
      expect(Array.isArray(args.config)).toBe(false)
      // object keys come from the schema properties (faker may generate a subset)
      const keys = Object.keys(args.config)
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

      const args = await generateStorybookArgs(content, {})
      expect(Array.isArray(args.items)).toBe(true)
      if (args.items.length > 0) {
        expect(args.items[0]).toBeInstanceOf(Object)
        expect(Array.isArray(args.items[0])).toBe(false)
      }
    })

    it('keeps type:object with examples as a plain object (nested object property)', async () => {
      const content: SDCSchema = {
        props: {
          properties: {
            identifier: { type: 'string', title: 'Identifier', examples: ['123456'] },
            address: {
              type: 'object',
              title: 'Address',
              examples: [
                { street: 'Example Street 1', postalCode: 8000, city: 'City', country: 'Country' },
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

    it('converts a non-object-typed schema that generates an object via Object.values', async () => {
      // A schema with enum containing an object value but no explicit type:'object'
      // json-schema-faker will pick the enum value; result is an Object → converted to array of values
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
})
