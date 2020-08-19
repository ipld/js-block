/* globals it */
import Block from '@ipld/block/defaults'
import assert from 'assert'

const test = it
const same = assert.deepStrictEqual

test('dag-cbor in defaults', async () => {
  const b = Block.encoder({ hello: 'world' }, 'dag-cbor')
  const encoded = b.encode()
  same(Block.decoder(encoded, 'dag-cbor').encode(), encoded)
})
