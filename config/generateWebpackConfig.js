module.exports = ({ buildFolder, appName }) => {
  return `const path = require("path");
  const outputPath = path.resolve("${buildFolder}");

  module.exports = {
    entry: {
      ${appName}_app: "./src/index.js"
    },
    output: {
      filename: "[name].js",
      path: outputPath,
      publicPath: "/"
    },
    devServer: {
      https: true,
      disableHostCheck: true,
      contentBase: outputPath,
      compress: true
    },
    optimization: {
      splitChunks: {
        cacheGroups: {
          default: false,
          vendors: {
            name: "${appName}_vendor",
            test: /[\\/]node_modules[\\/]/,
            chunks: "all"
          }
        }
      }
    },
    module: {
      rules: [
        {
          test: /\.m?jsx?$/,
          exclude: /(node_modules)/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env']
            }
          }
        }
      ]
    }
  }
  `;
};
