import transform from 'lodash.transform'
import createReader from './reader.js'
import json from 'multiformats/codecs/json'
import raw from 'multiformats/codecs/raw'
import { sha256 } from 'multiformats/hashes/sha2'
import { bytes, CID } from 'multiformats'

const readonly = value => ({ get: () => value, set: () => { throw new Error('Cannot set read-only property') } })

const immutableTypes = new Set(['number', 'string', 'boolean'])

const { coerce, isBinary } = bytes
const copyBinary = value => {
  const b = coerce(value)
  return coerce(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength))
}
const reader = createReader(CID)

const clone = obj => transform(obj, (result, value, key) => {
  if (value && value.asCID === value) {
    result[key] = value
  } else if (isBinary(value)) {
    result[key] = copyBinary(value)
  } else if (typeof value === 'object' && value !== null) {
    result[key] = clone(value)
  } else {
    result[key] = value
  }
})

class Block {
  constructor (opts) {
    if (!opts) throw new Error('Block options are required')
    if (opts.codec) {
      if (typeof opts.codec !== 'object') {
        const codec = Block.codecs.get(opts.codec)
        if (!opts.codec) throw new Error(`Cannot find codec ${JSON.stringify(opts.codec)}`)
        opts.codec = codec
      }
    } else {
      if (!opts.cid) throw new Error('Cannot create block instance without cid or codec')
      opts.codec = Block.codecs.get(opts.cid.code)
    }
    if (typeof opts.source === 'undefined' &&
        typeof opts.data === 'undefined') {
      throw new Error('Block instances must be created with either an encode source or data')
    }
    if (typeof opts.source !== 'undefined' && !opts.codec && !opts.code) {
      throw new Error('Block instances created from source objects must include desired codec')
    }
    if (opts.data && !opts.cid && !opts.codec && !opts.code) {
      throw new Error('Block instances created from data must include cid or codec')
    }
    opts.hasher = opts.hasher || sha256
    // Do our best to avoid accidental mutations of the options object after instantiation
    // Note: we can't actually freeze the object because we mutate it once per property later
    opts = Object.assign({}, opts)
    Object.defineProperty(this, 'opts', readonly(opts))
    Object.defineProperty(this, 'asBlock', readonly(this))
  }

  get hasher () {
    if (this.opts.cid) {
      if (!this.opts.hasher) {
        this.opts.hasher = Block.codecs.get(this.opts.cid.multihash.code)
      } else if (this.opts.hasher.code !== this.opts.cid.multihash.code) {
        this.opts.hasher = Block.codecs.get(this.opts.cid.multihash.code)
      } else {
        return this.opts.hasher || sha256
      }
      if (!this.opts.hasher) throw new Error('Do not have hash implementation')
    }
    return this.opts.hasher || sha256
  }

  source () {
    if (this.opts.cid || this.opts.data ||
        this._encoded || this._decoded) return null
    if (!this.opts.source) return null
    return this.opts.source
  }

  async cid () {
    if (this.opts.cid) return this.opts.cid
    const hash = await this.hasher.digest(this.encodeUnsafe())
    const cid = CID.create(1, this.opts.codec.code, hash)
    this.opts.cid = cid
    // https://github.com/bcoe/c8/issues/135
    /* c8 ignore next */
    return cid
  }

  get codec () {
    if (this.opts.cid) {
      if (!this.opts.codec || this.opts.codec.code !== this.opts.cid.code) {
        this.opts.codec = Block.codecs.get(this.opts.cid.code)
      }
    } else if (this.opts.code) {
      this.opts.codec = Block.codecs.get(this.opts.code)
    }
    return this.opts.codec.name
  }

  get code () {
    if (this.opts.cid) return this.opts.cid.code
    if (!this.opts.code) {
      this.opts.code = this.opts.codec.code
    }
    return this.opts.code
  }

  async validate () {
    // if we haven't created a CID yet we know it will be valid :)
    if (!this.opts.cid) return true
    if (!this.opts.hasher) throw new Error('Must have hasher in order to perform comparison')
    const cid = await this.cid()
    const data = this.encodeUnsafe()
    const hash = await this.hasher.digest(data)
    if (bytes.equals(cid.multihash.bytes, hash.bytes)) return true
    throw new Error('Bytes do not match')
  }

  _encode () {
    if (!this.opts.data && !this.opts.codec) {
      throw new Error('Do not have codec implemention in this Block interface')
    }
    this._encoded = this.opts.data || this.opts.codec.encode(this.opts.source)
  }

  encode () {
    if (!this._encoded) this._encode()
    return copyBinary(this._encoded)
  }

  encodeUnsafe () {
    if (!this._encoded) this._encode()
    return this._encoded
  }

  _decode () {
    if (typeof this.opts.source !== 'undefined') this._decoded = this.opts.source
    else {
      this._decoded = this.opts.codec.decode(this._encoded || this.opts.data)
    }
    return this._decoded
  }

  decode () {
    // TODO: once we upgrade to the latest data model version of
    // dag-pb that @gozala wrote we should be able to remove this
    // and treat it like every other codec.
    /* c8 ignore next */
    if (this.codec === 'dag-pb') return this._decode()
    if (!this._decoded) this._decode()
    const tt = typeof this._decoded
    if (tt === 'number' || tt === 'boolean') {
      // return any immutable types
      return this._decoded
    }
    if (isBinary(this._decoded)) return copyBinary(this._decoded)
    if (immutableTypes.has(typeof this._decoded) || this._decoded === null) {
      return this._decoded
    }
    return clone(this._decoded)
  }

  decodeUnsafe () {
    if (!this._decoded) this._decode()
    return this._decoded
  }

  reader () {
    return reader(this.decodeUnsafe())
  }

  async equals (block) {
    if (block === this) return true
    const cid = await this.cid()
    if (block.asCID === block) return cid.equals(block)
    // https://github.com/bcoe/c8/issues/135
    /* c8 ignore next */
    return cid.equals(await block.cid())
  }
}

Block.codecs = new Map()

Block.add = codec => {
  if (codec.name) Block.codecs.set(codec.name, codec)
  if (codec.code) Block.codecs.set(codec.code, codec)
}
Block.add(json)
Block.add(raw)

Block.encoder = (source, codec, hasher) => new Block({ source, codec, hasher })
Block.decoder = (data, codec, hasher) => new Block({ data, codec, hasher })
Block.create = (data, cid) => {
  if (typeof cid === 'string') cid = CID.parse(cid)
  const codec = Block.codecs.get(cid.code)
  return new Block({ data, cid, codec })
}
Block.defaults = opts => ({
  CID,
  defaults: opts,
  encoder: (source, codec, hasher) => new Block({
    source,
    codec: codec || opts.codec,
    hasher: hasher || opts.hasher
  }),
  decoder: (data, codec, hasher) => new Block({
    data,
    codec: codec || opts.codec,
    hasher: hasher || opts.hasher
  }),
  create: Block.create,
  codecs: Block.codecs,
  add: Block.add
})
Block.CID = CID

export default Block
