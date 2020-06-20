import globby from 'globby'
import path from 'path'

let configs = [
  {
    input: 'defaults.js',
    output: {
      file: 'dist/defaults.cjs',
      format: 'cjs'
    }
  },
  {
    input: 'index.js',
    output: {
      file: 'dist/index.cjs',
      format: 'cjs'
    }
  },
  {
    input: 'basics.js',
    output: {
      file: 'dist/basics.cjs',
      format: 'cjs'
    }
  }
]

const relativeToMain = name => ({
  name: 'relative-to-main',
  renderChunk: source => {
    while (source.includes("require('../index.js')")) {
      source = source.replace("require('../index.js')", `require('${name}')`)
    }
    while (source.includes("require('../')")) {
      source = source.replace("require('../", `require('${name}/`)
    }
    return source
  }
})

const plugins = [relativeToMain('@ipld/block')]
const add = (pattern) => {
  configs = configs.concat(globby.sync(pattern).map(inputFile => ({
    input: inputFile,
    output: {
      plugins,
      file: path.join('dist', inputFile).replace('.js', '.cjs'),
      format: 'cjs'
    }
  })))
}
add('tests/*.js')
console.log(configs)

export default configs
