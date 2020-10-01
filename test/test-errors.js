'use strict'
/* globals it */
import Block from '@ipld/block'
import assert from 'assert'

const same = assert.deepStrictEqual
const test = it

const tryError = async (fn, message) => {
  try {
    await fn()
  } catch (e) {
    same(e.message, message)
  }
}

test('No block options', async () => {
  await tryError(() => new Block(), 'Block options are required')
})

test('No data or source', async () => {
  await tryError(() => new Block({}), 'Cannot create block instance without cid or codec')
})

test('source only', async () => {
  await tryError(() => new Block({ source: {} }), 'Cannot create block instance without cid or codec')
})

test('data only', async () => {
  await tryError(() => new Block({ data: Buffer.from('asdf') }), 'Cannot create block instance without cid or codec')
})

test('set opts', async () => {
  const block = Block.encoder({}, 'json')
  await tryError(() => { block.opts = 'asdf' }, 'Cannot set read-only property')
})
