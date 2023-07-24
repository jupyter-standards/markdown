const path = require('path');

module.exports = {
    entry: './src/editor.mjs',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'editor.bundle.js'
    },
    module: {
    rules: [
        { test: /(?<!\.raw)\.css$/, use: ['style-loader', 'css-loader'] },
        { test: /\.(jpg|png|gif)$/, type: 'asset/resource' },
        { test: /\.js.map$/, type: 'asset/resource' },
        {
          test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/,
          type: 'asset/resource'
        },
        {
          test: /\.woff(\?v=\d+\.\d+\.\d+)?$/,
          type: 'asset/resource'
        },
        {
          test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
          type: 'asset/resource'
        },
        { test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, type: 'asset/resource' },
        {
          // In .ts and .tsx files (both of which compile to .js), svg files
          // must be loaded as a raw string instead of data URIs.
          test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
          issuer: /\.js$/,
          type: 'asset/source'
        },
        {
          test: /\.m?js$/,
          type: 'javascript/auto'
        },
        {
          test: /\.m?js/,
          resolve: {
            fullySpecified: false
          }
        },
        {
          test: /\.c?js/,
          resolve: {
            fullySpecified: false
          }
        }
    ]},
    resolve:{
      // Trick to ensure singleton version of codemirror packages are loaded
    modules: [path.join(__dirname, '../node_modules')]
  }
}
