const path = require('path');

module.exports = {
  mode: 'production',  // Enables minification & optimizations
  entry: './src/index.js',  // Your app's entry point
  output: {
    filename: 'bundle.[contenthash].js',  // Cache-busted filename
    path: path.resolve(__dirname, 'dist'),
    clean: true  // Cleans old files before each build
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,  // Transpile JS/JSX
        exclude: /node_modules/,
        use: 'babel-loader'
      },
      {
        test: /\.css$/,  // Handle CSS
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|jpg|gif)$/,  // Optimize images
        type: 'asset',
        parser: { dataUrlCondition: { maxSize: 8 * 1024 } }  // Inline small images
      }
    ]
  },
  optimization: {
    splitChunks: { chunks: 'all' }  // Splits vendor code into separate bundle
  }
};