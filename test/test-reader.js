/* globals it */
import Block from '@ipld/block/basics'
import assert from 'assert'
const { CID } = Block

const same = assert.deepStrictEqual
const test = it

const link = CID.from('bafyreidykglsfhoixmivffc5uwhcgshx4j465xwqntbmu43nb2dzqwfvae')

const fixture = {
  n: null,
  a: ['0', 1, link, {}, { n: null, l: link }],
  o: {
    n: null,
    l: link
  },
  l: link
}

const getReader = () => Block.encoder(fixture, 'dag-cbor').reader()

test('get path', () => {
  const reader = getReader()
  const one = reader.get('/a/1').value
  same(one, 1)
  const incomplete = reader.get('l/one/two')
  same(incomplete.remaining, 'one/two')
  assert.ok(CID.asCID(incomplete.value))
})

/*
test('source optimization', () => {
  let reader = mock.reader({ source: () => fixture })
  let one = reader.get('/a/1').value
  same(one, 1)
  reader = mock.reader({ source: () => null, decode: () => fixture })
  one = reader.get('/a/1').value
  same(one, 1)
})
*/

test('links', () => {
  const reader = getReader()
  const links = Array.from(reader.links())
  const keys = new Set(links.map(a => a[0]))
  same(keys, new Set(['a/2', 'a/4/l', 'l', 'o/l']))
  links.forEach(l => assert.ok(CID.asCID(l[1])))
})

test('tree', () => {
  const reader = getReader()
  const tree = Array.from(reader.tree())
  same(new Set(tree), new Set([
    'a',
    'a/0',
    'a/1',
    'a/2',
    'a/3',
    'a/4',
    'a/4/l',
    'a/4/n',
    'l',
    'n',
    'o',
    'o/l',
    'o/n'
  ]))
})

test('property not found', () => {
  const reader = getReader()
  let threw = false
  try {
    reader.get('notfound')
  } catch (e) {
    threw = true
    same(e.message, 'Object has no property notfound')
  }
  assert(threw)
})
