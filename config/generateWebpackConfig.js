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
      historyApiFallback: { index: "${appName}.html" }
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
    }
  }
  `;
};
