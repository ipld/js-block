'use strict'
/* globals it, describe */
import multiformats from 'multiformats/basics'
import create from '@ipld/block'
import dagjson from '@ipld/dag-json'
import dagcbor from '@ipld/dag-cbor'
import base58 from 'multiformats/bases/base58'
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

        describe('native types', () => {
          const block = Block.encoder('foo', id)
          const encoded = block.encode()
          assert.ok(isBinary(encoded))
          const flip = obj => {
            const encoded = Block.encoder(obj, id).encode()
            return Block.decoder(encoded, id).decode()
          }
          const _tests = [
            ['string', 'test'],
            ['null', null],
            ['int', 12],
            ['uint', -1],
            ['float', 1.2],
            ['true', true],
            ['false', false],
            ['empty array', []],
            ['array', ['asdf']]
          ]
          for (const [name, value] of _tests) {
            test(name, () => same(flip(value), value))
          }
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
          const cid = CID.from('zdpuAtX7ZibcWdSKQwiDCkPjWwRvtcKCPku9H7LhgA4qJW4Wk')
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
          const cid1 = await block1.cid()
          const cid2 = await block2.cid()
          same(cid1.equals(cid2), true)
          const e1 = block1.encode()
          same(e1, block1.encodeUnsafe())
          const e2 = block2.encode()
          same(e2, block2.encodeUnsafe())
          same(e1, e2)
          const block3 = Block.encoder('hello world', id)
          const block4 = Block.decoder(e1, id)
          same(await block1.equals(block1), true)
          same(await block1.equals(await block1.cid()), true)
          same(await block1.equals(block2), true)
          same(await block1.equals(block3), false)
          same(await block1.equals(block4), true)
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
  test('get code from cid', async () => {
    let block = Block.encoder({ hello: 'world' }, 'dag-cbor')
    const c = block.code
    same(c, 113)
    block = Block.create(block.encode(), await block.cid())
    same(block.code, 113)
  })

  test('Block cid', async () => {
    let block = Block.encoder({ hello: 'world' }, 'dag-cbor')
    let cid = await block.cid()
    same(cid.toString('base58btc'), 'zdpuAtX7ZibcWdSKQwiDCkPjWwRvtcKCPku9H7LhgA4qJW4Wk')
    block = Block.encoder({ hello: 'world' }, 'dag-cbor', 'sha2-512')
    cid = await block.cid()
    same(cid.toString('base58btc'), 'zBwW8ZGUCK3yY7Xxmqzm1sCjzE2Z8msvEdRCX1s9RKS61i5V8owNmCwfazw6hfetkzLW4KejDt1i566b8yEYuWAQi2Yyr')
    block = Block.create(await block.encode(), 'zBwW8ZGUCK3yY7Xxmqzm1sCjzE2Z8msvEdRCX1s9RKS61i5V8owNmCwfazw6hfetkzLW4KejDt1i566b8yEYuWAQi2Yyr')
    same((await block.cid()).toString('base58btc'), 'zBwW8ZGUCK3yY7Xxmqzm1sCjzE2Z8msvEdRCX1s9RKS61i5V8owNmCwfazw6hfetkzLW4KejDt1i566b8yEYuWAQi2Yyr')
    same(block.codec, 'dag-cbor')
    same(await block.validate(), true)
    block = Block.create(await block.encode(), cid)
    same((await block.cid()).toString('base58btc'), 'zBwW8ZGUCK3yY7Xxmqzm1sCjzE2Z8msvEdRCX1s9RKS61i5V8owNmCwfazw6hfetkzLW4KejDt1i566b8yEYuWAQi2Yyr')
    same(block.codec, 'dag-cbor')
    block = Block.create(fromString('asdf'), 'zBwW8ZGUCK3yY7Xxmqzm1sCjzE2Z8msvEdRCX1s9RKS61i5V8owNmCwfazw6hfetkzLW4KejDt1i566b8yEYuWAQi2Yyr')
    let threw = true
    try {
      await block.validate()
      threw = false
    } catch (e) {
      if (e.message !== 'Buffer does not match hash') throw e
    }
    same(threw, true)
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
