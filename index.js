import transform from 'lodash.transform'
import reader from './reader.js'
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

const clone = obj => transform(obj, (result, value, key) => {
  const cid = CID.asCID(value)
  if (cid) {
    result[key] = cid
  } else if (isBinary(value)) {
    result[key] = copyBinary(value)
  } else if (typeof value === 'object' && value !== null) {
    result[key] = clone(value)
  } else {
    result[key] = value
  }
})

const setImmutable = (obj, key, value) => {
  if (typeof value === 'undefined') throw new Error(`${key} cannot be undefined`)
  Object.defineProperty(this, key, readonly(value))
}

class Block {
  constructor ({ codec, hasher, source, cid, data }) {
    setImmutable(this, '_codec', codec)
    setImmutable(this, '_hasher', hasher)
    if (source) setImmutable(this, '_source', source)
    if (cid) setImmutable(this, '_cid', cid)
    if (data) setImmutable(this, '_data', data)
    if (!source && (!data || !cid)) throw new Error('Missing required argument')
    if (source && (!codec || !hasher)) throw new Error('Missing required argument')
    setImmutable(this, 'asBlock', this)
  }

  async cid () {
    if (this._cid) return this._cid
    const hash = await this._hasher.digest(this.encodeUnsafe())
    const cid = CID.create(1, this.opts.codec.code, hash)
    setImmutable(this, '_cid', cid)
    return cid
  }

  get code () {
    if (this._cid) return this._cid.code
    return this._codec.code
  }

  encode () {
    const data = this.encodeUnsafe()
    return copyBinary(data)
  }

  encodeUnsafe () {
    if (this._data) return this._data
    if (!this._codec) {
      throw new Error('Do not have codec implemention in this Block interface')
    }
    const data = this._codec.encode(this._source)
    setImmutable(this, '_data', data)
    return data
  }

  decodeUnsafe () {
    if (typeof this.opts._source !== 'undefined') return this._source
    if (!this._codec) {
      throw new Error('Do not have codec implemention in this Block interface')
    }
    const source = this._codec.decode(this._data)
    setImmutable(this, '_source', source)
    return source
  }

  decode () {
    const decoded = this.decodeUnsafe()
    if (decoded === null) return null
    if (isBinary(decoded)) return copyBinary(decoded)
    if (immutableTypes.has(typeof decoded) || decoded === null) {
      return decoded
    }
    return clone(decoded)
  }

  reader () {
    return reader(this.decodeUnsafe())
  }

  async equals (block) {
    if (block === this) return true
    if (block.asBlock !== block) return false
    const [a, b] = await Promise.all([this.cid(), block.cid()])
    return a.equals(b)
  }
}

Block.codecs = new Map()

Block.add = codec => {
  if (codec.name) Block.codecs.set(codec.name, codec)
  if (codec.code) Block.codecs.set(codec.code, codec)
}
Block.add(json)
Block.add(raw)

Block.encoder = (source, codec, hasher = sha256) => {
  if (typeof codec === 'string') codec = Block.codecs.get(codec)
  if (!codec) throw new Error('Missing codec')
  return new Block({ source, codec, hasher })
}
Block.decoder = (data, codec, hasher = sha256) => {
  if (typeof codec === 'string') codec = Block.codecs.get(codec)
  if (!codec) throw new Error('Missing codec')
  return new Block({ data, codec, hasher })
}
Block.createUnsafe = (data, cid, { hasher, codec } = {}) => {
  codec = codec || Block.codecs.get(cid.code)
  if (!codec) throw new Error(`Missing codec ${cid.code}`)
  return new Block({ data, cid, codec, hasher: hasher || null })
}
Block.create = async (data, cid, { hasher, codec } = {}) => {
  hasher = hasher || Block.codec.get(cid.multihash.code)
  if (!hasher) {
    const { code } = cid.multihash.code
    throw new Error(`Missing hasher for verification. Pass hasher for hash type ${code} or use createUnsafe()`)
  }
  const hash = await hasher.digest(data)
  if (!bytes.equals(cid.multihash.bytes, hash.bytes)) {
    throw new Error('CID hash does not match data')
  }
  return Block.createUnsafe(data, cid, { hasher, codec })
}
Block.defaults = opts => ({
  CID,
  defaults: opts,
  encoder: (source, codec, hasher) => Block.encoder(source, codec || opts.codec, hasher || opts.hasher),
  decoder: (data, codec, hasher) => Block.decoder(data, codec || opts.codec, hasher || opts.hasher),
  createUnsafe: (data, cid, { hasher, codec } = {}) => Block.createUnsafe(data, cid, {
    hasher: hasher || opts.hasher,
    codec: codec || opts.codec
  }),
  create: (data, cid, { hasher, codec } = {}) => Block.create(data, cid, {
    hasher: hasher || opts.hasher,
    codec: codec || opts.codec
  }),
  codecs: Block.codecs,
  add: Block.add
})
Block.CID = CID

export default Block
