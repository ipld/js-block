/* globals it */
const assert = require('assert')
const create = require('@ipld/block')
const BasicBlock = require('@ipld/block/basics.js')
const DefaultBlock = require('@ipld/block/defaults.js')

const same = assert.deepStrictEqual
const test = it

test('dag-cbor imports basics', () => {
  same(typeof create, 'function')
  same(typeof BasicBlock.encoder, 'function')
  same(typeof DefaultBlock.encoder, 'function')
})
