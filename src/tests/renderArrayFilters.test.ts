import { describe, expect, test } from 'vitest'
import Twig from 'twig'
import twing from 'twing'
import { addDrupalExtensions } from '@christianwiedemann/drupal-twig-extensions/twing'
import { addClass, setAttribute } from '../renderer/renderArrayFilters.ts'
import { PrintableArray, twigArgs } from '../renderer/nodes.ts'
import { createTwigCore } from '../renderer/twig.ts'
import { createTwingCore } from '../renderer/twing.ts'

describe('add_class', () => {
  test.each([
    [
      '<a href="/">Home</a>',
      ['card-link'],
      '<a href="/" class="card-link">Home</a>',
    ],
    ['<a class="x">Home</a>', ['y', 'x'], '<a class="x y">Home</a>'],
    ['<p>Text</p>', [['a', 'b'], 'c'], '<p class="a b c">Text</p>'],
    [
      '  <!-- c --><img src="i.png"/>',
      ['i'],
      '  <!-- c --><img src="i.png" class="i"/>',
    ],
    ['plain text', ['x'], 'plain text'],
  ])('%s + %j', (html, classes, expected) => {
    expect(addClass(html, ...classes)).toBe(expected)
  })

  test('adds the class to each item of a slot list', () => {
    const out = addClass(new PrintableArray('<a>1</a>', '<a>2</a>'), 'l')
    expect(out).toBeInstanceOf(PrintableArray)
    expect([...(out as PrintableArray)]).toEqual([
      '<a class="l">1</a>',
      '<a class="l">2</a>',
    ])
  })
})

describe('set_attribute', () => {
  test.each([
    ['<a>Home</a>', ['id', 'home'], '<a id="home">Home</a>'],
    ['<a id="old">Home</a>', ['id', 'new'], '<a id="new">Home</a>'],
    ['<input>', ['required', true], '<input required>'],
    ['<a title="t">Home</a>', ['title', null], '<a>Home</a>'],
    ['<a>Home</a>', ['title', 'a "b"'], '<a title="a &quot;b&quot;">Home</a>'],
  ])('%s + %j', (html, [name, value], expected) => {
    expect(setAttribute(html, name, value)).toBe(expected)
  })
})

describe('the filters in twig.js templates', () => {
  createTwigCore({}).registerCore(Twig)
  const render = (data: string, context: Record<string, unknown>) =>
    Twig.twig({ data }).render(twigArgs(context, ['links']))

  test('add_class and set_attribute on a slot', () => {
    expect(
      render(
        "{{ links|add_class('card-link', 'x')|set_attribute('rel', 'nofollow') }}",
        {
          links: ['<a href="/a">A</a>', '<a href="/b">B</a>'],
        }
      )
    ).toBe(
      '<a href="/a" class="card-link x" rel="nofollow">A</a><a href="/b" class="card-link x" rel="nofollow">B</a>'
    )
  })
})

describe('the filters on Twing replace the wrapping <div> ones', () => {
  test.each([
    [
      "{{ links|add_class('card-link', 'x')|set_attribute('rel', 'nofollow') }}",
      '<a href="/a" class="card-link x" rel="nofollow">A</a><a href="/b" class="card-link x" rel="nofollow">B</a>',
    ],
    [
      "{{ links|add_class(['a', 'b']) }}",
      '<a href="/a" class="a b">A</a><a href="/b" class="a b">B</a>',
    ],
  ])('%s', (data, expected) => {
    const env = twing.createSynchronousEnvironment(
      twing.createSynchronousArrayLoader({ t: data })
    )
    addDrupalExtensions(env)
    createTwingCore({}).registerCore(env)
    const links = ['<a href="/a">A</a>', '<a href="/b">B</a>']
    expect(env.render('t', twigArgs({ links }, ['links']))).toBe(expected)
  })
})
