# Block API

The `Block` API is the single endpoint for authoring IPLD data structures. Unless you're
implementing a new codec you can get everything you need from the Block API: encoding, 
decoding, cid creation w/ hashing.

## `Block.encoder(object, codec, algorithm = 'sha2-256')`

Create a Block instance from either a native object.

The `cid` as well as encoding will not happen until requested
and then will be cached when appropriate.

```javascript
let block = Block.encoder({hello: 'world'}, 'dag-cbor')
```

Returns a `Block` instance.

## `Block.decoder(binary, codec, algorithm = 'sha2-256')`

Create a Block instance from an existing binary encoded block

The `cid` as well as decoding will not happen until requested
and then will be cached when appropriate.

```javascript
let block = Block.decoder(someBuffer, 'dag-cbor')
```

Returns a `Block` instance.

## `Block.create(binary, cid)`

Create a new block from the raw binary data and cid.

`cid` can be an instance of `CID` or a base encoded string of a cid.

Returns a `Block` instance.

## `Block(opts)`

Once a block instance is created the information represented in the block is considered
immutable.

### `block.decode()`

Promise that resolves to a native JavaScript object decoded from the block data.

A new object is returned on every call. The decoding is not cached because it is
likely to be mutated by the consumer.

### `block.cid()`

Promise that resolves to a `cid` instance. Cached after creation.

### `block.encode()`

Promise that resolves to a `Buffer` instance encoded from the source input.

### `block.reader()`

Returns an instance of `Reader()` from the codec implementation.

### `block.validate()`

Returns true/false if the CID's multihash matches the given block.

If a CID hasn't been created yet it will return true since we know the hash will
match in our eventually created CID.


