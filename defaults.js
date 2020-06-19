import Block from './basics.js'
import dagcbor from '@ipld/dag-cbor'
Block.multiformats.multicodec.add(dagcbor)

export default Block
