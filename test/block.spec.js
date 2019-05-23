'use strict'
/* globals it */
const Block = require('../')
const dagjson = require('@ipld/dag-json')
const assert = require('assert')
const tsame = require('tsame')

const same = (...args) => assert.ok(tsame(...args))
const test = it

test('Block encode', async () => {
  let block = Block.encoder({ hello: 'world' }, 'dag-json')
  let encoded = await block.encode()
  assert.ok(Buffer.isBuffer(encoded))
  same(encoded, await dagjson.encode({ hello: 'world' }))
})

test('Block data caching', async () => {
  let block = Block.encoder({ hello: 'world' }, 'dag-cbor')
  let encoded = await block.encode()
  encoded.test = true
  assert.ok((await block.encode()).test)
})

test('Block decode', async () => {
  let data = await dagjson.encode({ hello: 'world' })
  let block = Block.decoder(data, 'dag-json')
  let decoded = await block.decode()
  same(decoded, { hello: 'world' })
  block = Block.encoder({ hello: 'world' }, 'dag-json')
  decoded = await block.decode()
  same(decoded, { hello: 'world' })
  // test data caching
  decoded = await block.decode()
  same(decoded, { hello: 'world' })
  same(await block.validate(), true)
})

test('Block cid', async () => {
  let block = Block.encoder({ hello: 'world' }, 'dag-cbor')
  let cid = await block.cid()
  same(cid.toBaseEncodedString('base58btc'), 'zdpuAtX7ZibcWdSKQwiDCkPjWwRvtcKCPku9H7LhgA4qJW4Wk')
  block = Block.encoder({ hello: 'world' }, 'dag-cbor', 'sha1')
  cid = await block.cid()
  same(cid.toBaseEncodedString('base58btc'), 'z8d8Cu56HEXrUTgRbLdkfRrood2EhZyyL')
  block = Block.create(await block.encode(), 'z8d8Cu56HEXrUTgRbLdkfRrood2EhZyyL')
  same((await block.cid()).toBaseEncodedString('base58btc'), 'z8d8Cu56HEXrUTgRbLdkfRrood2EhZyyL')
  same(block.codec, 'dag-cbor')
  same(await block.validate(), true)
  block = Block.create(await block.encode(), cid)
  same((await block.cid()).toBaseEncodedString('base58btc'), 'z8d8Cu56HEXrUTgRbLdkfRrood2EhZyyL')
  same(block.codec, 'dag-cbor')
  block = Block.create(Buffer.from('asdf'), 'z8d8Cu56HEXrUTgRbLdkfRrood2EhZyyL')
  same(await block.validate(), false)
})

const testRaw = async () => {
  let block = Block.encoder(Buffer.from('asdf'), 'raw')
  let data = await block.encode()
  same(data, Buffer.from('asdf'))
  block = Block.decoder(Buffer.from('asdf'), 'raw')
  data = await block.decode()
  same(data, Buffer.from('asdf'))
  block = Block.encoder(Buffer.from('asdf'), 'raw')
  data = await block.decode()
  same(data, Buffer.from('asdf'))
}

test('raw codec', async () => {
  await testRaw()
})

test('async codec', async () => {
  const asyncRaw = {
    encode: async x => x,
    decode: async x => x,
    codec: 'raw'
  }
  let asyncModule = new Promise(resolve => resolve(asyncRaw))
  asyncModule.codec = 'raw'
  Block.getCodec.setCodec(asyncModule)
  await testRaw()

  Block.getCodec.setCodec(asyncRaw)
  await testRaw()

  let asyncRawModule = new Promise(resolve => resolve(asyncRaw))
  asyncRawModule.codec = 'raw'
  Block.getCodec.setCodec(asyncRawModule)
  await testRaw()
})

test('source', async () => {
  let encoder = Block.encoder({ hello: 'world' }, 'dag-json')
  same(encoder.source(), { hello: 'world' })
  await encoder.cid()
  same(encoder.source(), null)
  encoder = Block.encoder({}, 'dag-json')
  await encoder.encode()
  same(encoder.source(), null)
  let block = Block.decoder(Buffer.from('asd'), 'dag-json')
  same(block.source(), null)
  encoder = Block.encoder({}, 'dag-json')
  delete encoder.opts.source
  same(encoder.source(), null)
})

test('reader', async () => {
  let encoder = Block.encoder({ hello: 'world' }, 'dag-json')
  let reader = await encoder.reader()
  same(reader.get('hello').value, 'world')
})
