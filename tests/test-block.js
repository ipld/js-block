'use strict'
/* globals it, describe */
import multiformats from 'multiformats/basics.js'
import create from '../index.js'
import dagjson from '@ipld/dag-json'
import dagcbor from '@ipld/dag-cbor'
import base58 from 'multiformats/bases/base58.js'
import assert from 'assert'

const { bytes, multicodec, multibase, CID } = multiformats
const { fromString, toString } = bytes
const isBinary = o => {
  if (o instanceof Uint8Array && o.constructor.name === 'Uint8Array') return true
  return false
}
const Block = create(multiformats)
const same = assert.deepStrictEqual
const test = it

multibase.add(base58)

for (const codec of [dagjson, dagcbor]) {
  multiformats.add(codec)
  const { name, code } = codec(multiformats)
  describe(name, () => {
    for (const id of [name, code]) {
      describe(`w/ ${typeof id === 'string' ? 'name' : 'code'}`, () => {
        test('Block encode', done => {
          const block = Block.encoder({ hello: 'world' }, id)
          const encoded = block.encodeUnsafe()
          assert.ok(isBinary(encoded))
          const comp = multicodec.encode({ hello: 'world' }, id)
          same(encoded, comp)
          done()
        })

        test('native types', done => {
          const block = Block.encoder('foo', id)
          const encoded = block.encode()
          assert.ok(isBinary(encoded))
          const flip = obj => {
            const encoded = Block.encoder(obj, id).encode()
            return Block.decoder(encoded, id).decode()
          }
          same(flip('test'), 'test')
          same(flip(null), null)
          same(flip(12), 12)
          same(flip(-1), -1)
          same(flip(1.2), 1.2)
          same(flip(true), true)
          same(flip(false), false)
          same(flip([]), [])
          same(flip(['asdf']), ['asdf'])
          done()
        })

        test('Block data caching', done => {
          const block = Block.encoder({ hello: 'world' }, id)
          const encoded = block.encodeUnsafe()
          encoded.test = true
          assert.ok((block.encodeUnsafe()).test)
          done()
        })

        test('Block decode', async () => {
          const data = multicodec.encode({ hello: 'world' }, id)
          let block = Block.decoder(data, id)
          let decoded = block.decode()
          same(decoded, { hello: 'world' })
          block = Block.encoder({ hello: 'world' }, id)
          decoded = block.decode()
          same(decoded, { hello: 'world' })
          // test data caching
          decoded = block.decode()
          same(decoded, { hello: 'world' })
          same(await block.validate(), true)
        })

        test('source', async () => {
          let encoder = Block.encoder({ hello: 'world' }, id)
          same(encoder.source(), { hello: 'world' })
          await encoder.cid()
          same(encoder.source(), null)
          encoder = Block.encoder({}, id)
          encoder.encode()
          same(encoder.source(), null)
          const block = Block.decoder(fromString('asd'), id)
          same(block.source(), null)
          encoder = Block.encoder({}, id)
          delete encoder.opts.source
          same(encoder.source(), null)
        })

        test('reader', done => {
          const encoder = Block.encoder({ hello: 'world' }, id)
          const reader = encoder.reader()
          same(reader.get('hello').value, 'world')
          done()
        })

        test('decode cache', done => {
          const block = Block.encoder({ hello: 'world' }, id)
          const decoded = block.decodeUnsafe()
          decoded.test = true
          assert.ok(block.decode().test)
          block.decode().test = false
          assert.ok(block.decode().test)
          assert.ok(block.decodeUnsafe().test)
          done()
        })

        test('decode deep object', done => {
          const cid = new CID('zdpuAtX7ZibcWdSKQwiDCkPjWwRvtcKCPku9H7LhgA4qJW4Wk')
          const o = { a: { b: [cid], c: fromString('x') } }
          const block = Block.encoder(o, id)
          const decoded = block.decode()
          same(decoded, o)
          done()
        })

        test('decode of immutable types', done => {
          let block = Block.encoder(1, id)
          same(block.decode(), 1)
          block = Block.encoder(true, id)
          same(block.decode(), true)
          done()
        })

        test('block equals', async () => {
          const block1 = Block.encoder({ hello: 'world' }, id)
          const block2 = Block.encoder({ hello: 'world' }, id)
          const block3 = Block.encoder('hello world', id)
          same(await block1.equals(block1), true)
          same(await block1.equals(await block1.cid()), true)
          same(await block1.equals(block2), true)
          same(await block1.equals(block3), false)
        })

        test('validate', async () => {
          let block = Block.encoder({ hello: 'world' }, id)
          const encoded = block.encode()
          const cid = await block.cid()
          block = Block.create(encoded, cid)
          same(await block.validate(), true)
        })
      })
    }
  })
}

describe('raw', () => {
  test('raw codec', done => {
    let block = Block.encoder(fromString('asdf'), 'raw')
    let data = block.encode()
    same(data, fromString('asdf'))
    block = Block.decoder(fromString('asdf'), 'raw')
    data = block.decode()
    same(data, fromString('asdf'))
    block = Block.encoder(fromString('asdf'), 'raw')
    data = block.decode()
    same(data, fromString('asdf'))
    done()
  })

  test('safe clone of buffers', done => {
    const block = Block.encoder(fromString('test'), 'raw')
    const decoded = block.decode()
    decoded[0] = 'd'.charCodeAt(0)
    same(toString(block.decode()), 'test')
    done()
  })
})

describe('cid()', () => {
  test('Block cid', async () => {
    let block = Block.encoder({ hello: 'world' }, 'dag-cbor')
    let cid = await block.cid()
    same(cid.toString('base58btc'), 'zdpuAtX7ZibcWdSKQwiDCkPjWwRvtcKCPku9H7LhgA4qJW4Wk')
    block = Block.encoder({ hello: 'world' }, 'dag-cbor', 'sha1')
    cid = await block.cid()
    same(cid.toString('base58btc'), 'z8d8Cu56HEXrUTgRbLdkfRrood2EhZyyL')
    block = Block.create(await block.encode(), 'z8d8Cu56HEXrUTgRbLdkfRrood2EhZyyL')
    same((await block.cid()).toString('base58btc'), 'z8d8Cu56HEXrUTgRbLdkfRrood2EhZyyL')
    same(block.codec, 'dag-cbor')
    same(await block.validate(), true)
    block = Block.create(await block.encode(), cid)
    same((await block.cid()).toString('base58btc'), 'z8d8Cu56HEXrUTgRbLdkfRrood2EhZyyL')
    same(block.codec, 'dag-cbor')
    block = Block.create(fromString('asdf'), 'z8d8Cu56HEXrUTgRbLdkfRrood2EhZyyL')
    same(await block.validate(), false)
  })
})

/*
describe('dag-pb', () => {
  test('dag-pb encode/decode', done => {
    const node = new DAGNode(fromString('some data'))
    const block = Block.encoder(node, 'dag-pb')
    const encoded = block.encode()
    const decoded = block.decode()
    same(encoded, Block.decoder(encoded, 'dag-pb').encode())
    same(decoded._data, fromString('some data'))
    done()
  })
})
*/
