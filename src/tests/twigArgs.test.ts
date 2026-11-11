import { describe, expect, test } from 'vitest'
import Twig from 'twig'
import { PrintableArray, twigArgs } from '../renderer/nodes.ts'

describe('twigArgs', () => {
  test('wraps slot values and lists of the component, nothing else', () => {
    const attributes = [['data-component-id', 'umami:badge']]
    const out = twigArgs(
      {
        text: '30 minutes',
        items: ['a', ['b']],
        title: 'Hi',
        empty: '',
        none: null,
        defaultAttributes: attributes,
      },
      ['text', 'empty', 'none'],
      ['items', 'title']
    )
    expect(out['text']).toBeInstanceOf(PrintableArray)
    expect([...(out['text'] as PrintableArray)]).toEqual(['30 minutes'])
    expect(out['items']).toBeInstanceOf(PrintableArray)
    expect([...(out['items'] as PrintableArray)][1]).toBeInstanceOf(
      PrintableArray
    )
    expect(out['title']).toBe('Hi')
    expect(out['empty']).toBe('')
    expect(out['none']).toBeNull()
    expect(out['defaultAttributes']).toBe(attributes)
  })

  test('keeps a value that is already printable and does not touch the input', () => {
    const printable = new PrintableArray('x')
    const args = { text: printable, items: ['a'] }
    const out = twigArgs(args, ['text'], ['items'])
    expect(out['text']).toBe(printable)
    expect(args.items).toEqual(['a'])
  })

  test('twig.js prints a list slot item by item and loops over a single value', () => {
    const print = Twig.twig({ data: '{{ c }}' })
    expect(print.render({ c: ['<a>', '<b>'] })).toBe('<a>,<b>')
    expect(print.render(twigArgs({ c: ['<a>', '<b>'] }, ['c'], []))).toBe(
      '<a><b>'
    )
    const loop = Twig.twig({ data: '{% for x in c %}[{{ x }}]{% endfor %}' })
    expect(loop.render(twigArgs({ c: '<a>' }, ['c'], []))).toBe('[<a>]')
  })
})
