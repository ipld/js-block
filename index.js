'use strict'
const CID = require('cids')
const getCodec = require('@ipld/get-codec')
const withIs = require('class-is')

const readonly = value => ({ get: () => value, set: () => { throw new Error('Cannot set read-only property') } })

const multihashing = require('multihashing-async')

class Block {
  constructor (opts) {
    if (!opts) throw new Error('Block options are required')
    if (!opts.source && !opts.data) {
      throw new Error('Block instances must be created with either an encode source or data')
    }
    if (opts.source && !opts.codec) {
      throw new Error('Block instances created from source objects must include desired codec')
    }
    if (opts.data && !opts.cid && !opts.codec) {
      throw new Error('Block instances created from data must include cid or codec')
    }
    if (!opts.cid && !opts.algo) opts.algo = 'sha2-256'
    // Do our best to avoid accidental mutations of the options object after instantiation
    // Note: we can't actually freeze the object because we mutate it once per property later
    opts = Object.assign({}, opts)
    Object.defineProperty(this, 'opts', readonly(opts))
  }
  source () {
    if (this.opts.cid || this.opts.data) return null
    if (!this.opts.source) return null
    return this.opts.source
  }
  async cid () {
    if (this.opts.cid) return this.opts.cid
    let codec = this.codec
    let hash = await multihashing(await this.encode(), this.opts.algo)
    let cid = new CID(1, codec, hash)
    this.opts.cid = cid
    return cid
  }
  get codec () {
    if (this.opts.cid) return this.opts.cid.codec
    else return this.opts.codec
  }
  async validate () {
    // if we haven't created a CID yet we know it will be valid :)
    if (!this.opts.cid) return true
    let cid = await this.cid()
    let data = await this.encode()
    return multihashing.validate(data, cid.multihash)
  }
  encode () {
    if (this.opts.data) return this.opts.data
    let codec = module.exports.getCodec(this.codec)
    let data = codec.encode(this.opts.source)
    this.opts.data = data
    return data
  }
  decode () {
    let codec = module.exports.getCodec(this.codec)
    if (!this.opts.data) this.encode()
    return codec.decode(this.opts.data)
  }
  reader () {
    let codec = module.exports.getCodec(this.codec)
    return codec.reader(this)
  }
}

let BlockWithIs = withIs(Block, { className: 'Block', symbolName: '@ipld/block' })
BlockWithIs.getCodec = getCodec

BlockWithIs.encoder = (source, codec, algo) => new BlockWithIs({ source, codec, algo })
BlockWithIs.decoder = (data, codec, algo) => new BlockWithIs({ data, codec, algo })
BlockWithIs.create = (data, cid/*, validate = false */) => {
  if (typeof cid === 'string') cid = new CID(cid)
  /*
  if (validate) {
    // TODO: validate cid hash matches data
  }
  */
  return new BlockWithIs({ data, cid })
}
module.exports = BlockWithIs
