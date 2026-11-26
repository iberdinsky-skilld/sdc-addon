import { describe, expect, test } from 'vitest'
import Twig from 'twig'
import DrupalAttribute from 'drupal-attribute'
import { PrintableArray, twigArgs } from '../renderer/nodes.ts'

describe('twigArgs', () => {
  test('wraps slot values, nested lists included, and leaves props alone', () => {
    const attributes = [['data-component-id', 'umami:badge']]
    const items = ['a', ['b']]
    const out = twigArgs(
      {
        text: '30 minutes',
        slides: ['a', ['b']],
        items,
        title: 'Hi',
        empty: '',
        none: null,
        defaultAttributes: attributes,
      },
      ['text', 'slides', 'empty', 'none']
    )
    expect(out['text']).toBeInstanceOf(PrintableArray)
    expect([...(out['text'] as PrintableArray)]).toEqual(['30 minutes'])
    expect([...(out['slides'] as PrintableArray)][1]).toBeInstanceOf(
      PrintableArray
    )
    expect(out['items']).toBe(items)
    expect(out['title']).toBe('Hi')
    expect(out['empty']).toBe('')
    expect(out['none']).toBeNull()
    expect(out['defaultAttributes']).toBe(attributes)
  })

  test('leaves a function slot alone, so the engine calls it', () => {
    const content = (): string => '<p>rendered</p>'
    expect(twigArgs({ content }, ['content'])['content']).toBe(content)
    const template = Twig.twig({ data: '<div>{{ content }}</div>' })
    expect(template.render(twigArgs({ content }, ['content']))).toBe(
      '<div><p>rendered</p></div>'
    )
  })

  test('keeps a value that is already printable and does not touch the input', () => {
    const printable = new PrintableArray('x')
    const args = { text: printable, items: ['a'] }
    const out = twigArgs(args, ['text'])
    expect(out['text']).toBe(printable)
    expect(args.items).toEqual(['a'])
  })

  test('a list prop stays an array for addClass() and merge on twig.js', () => {
    const template = Twig.twig({
      data: "{% set c = ['title']|merge(classes) %}<h2{{ attributes.addClass(c) }}></h2>",
    })
    const args = {
      attributes: new DrupalAttribute(),
      classes: ['mb-3', 'display-1'],
    }
    expect(template.render(twigArgs(args, []))).toBe(
      '<h2 class="title mb-3 display-1"></h2>'
    )
  })

  test('twig.js prints a list slot item by item and loops over a single value', () => {
    const print = Twig.twig({ data: '{{ c }}' })
    expect(print.render({ c: ['<a>', '<b>'] })).toBe('<a>,<b>')
    expect(print.render(twigArgs({ c: ['<a>', '<b>'] }, ['c']))).toBe('<a><b>')
    const loop = Twig.twig({ data: '{% for x in c %}[{{ x }}]{% endfor %}' })
    expect(loop.render(twigArgs({ c: '<a>' }, ['c']))).toBe('[<a>]')
  })
})
