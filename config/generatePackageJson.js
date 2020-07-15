module.exports = ({ buildFolder, hasHttpAuth, appName }) =>
  JSON.stringify(
    {
      name: "my-peoplesoft-app",
      version: "0.1.0",
      description: "app bootstrapped with Create PeopleSoft App",
      main: "src/index.js",
      license: "UNLICENSED",
      scripts: {
        deploy: `send-to-peoplesoft -d ${buildFolder} ${
          hasHttpAuth ? "--with-auth" : ""
        }`,
        clean: `mkdirp ${buildFolder} && rimraf ${buildFolder}/*`,
        "copy-assets": `cp ${appName}.css ${appName}.html ${buildFolder}`,
        prebuild: "yarn clean && yarn copy-assets",
        build: "webpack --mode production",
        prestart: "yarn clean",
        start: "webpack-dev-server --mode development"
      }
    },
    null,
    2
  );
