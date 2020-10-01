import Block from './index.js'
import { codec as multicodec } from 'multiformats'
import * as dagcbor from '@ipld/dag-cbor'
Block.add(multicodec.codec(dagcbor))

export default Block
