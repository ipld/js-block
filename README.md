# Block API

![239239](https://img.shields.io/badge/compiled%20bundle-239k-yellow) ![72352](https://img.shields.io/badge/gzipped%20bundle-72k-yellowgreen)

The `Block` API is the single endpoint for authoring IPLD data structures. Unless you're
implementing a new codec you can get everything you need from the Block API: encoding, 
decoding, cid creation w/ hashing.

## `Block.encoder(object, codec, algorithm = 'sha2-256')`

Create a Block instance from a native object.

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

Returns decoded block data.

A new object is returned on every call that is copied from a cached version of
the decoded block. This means you are free to mutate the return value and
that we'll never do more than one actual block decode in the codec.

### `block.decodeUnsafe()`

Returns the cached block data directly.

**Waring: If you mutate the return value bad things will happen.**

This operation is very fast and useful as long as you can ensure the return value
will not be mutated.

### `block.cid()`

Promise that resolves to a `cid` instance. Cached after creation.

### `block.encode()`

Returns a `Buffer` instance encoded from the source input.

The first time the block is encoded it is cached indefinitely. This method returns
a new copied buffer that you are free to mutate.

### `block.encodeUnsafe()`

Returns a `Buffer` instance encoded from the source input.

**Warning: If you mutate the return value bad things will happen.**

This returns the internal cached versoin of the block encode. It's very fast
and useful if you are certain the buffer won't be mutated.

### `block.reader()`

Returns an instance of `Reader()` from the codec implementation.

### `block.validate()`

Returns true/false if the CID's multihash matches the given block.

If a CID hasn't been created yet it will return true since we know the hash will
match in our eventually created CID.


