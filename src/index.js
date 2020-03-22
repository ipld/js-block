const bare = require('./bare')
const defaults = require('./codecs/defaults')
const builtins = require('./hashing/builtins')

module.exports = bare(defaults, builtins)
