#!/usr/bin/env node

const inquirer = require("inquirer");
const chalk = require("chalk");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const util = require("util");
const Request = require("request-promise");
const getToken = require("@highpoint/get-ps-token");
const packageJson = require("./package.json");
const openBrowser = require("react-dev-utils/openBrowser");
const generateGitIgnore = require("./config/generateGitIgnore");
const generateHtml = require("./config/generateHtml");
const generateJson = require("./config/generatePackageJson");
const generateWebpackConfig = require("./config/generateWebpackConfig");

const configHomeJsonPath = path.resolve(process.env.HOME, "cpsa.config.json");

const currentNodeVersion = process.versions.node;
const semver = currentNodeVersion.split(".");
const major = semver[0];

if (major < 10) {
  console.error(
    "You are running Node " +
      currentNodeVersion +
      ".\n" +
      "Create PeopleSoft App requires Node 10 or higher. \n" +
      "Please update your version of Node."
  );
  process.exit(1);
}

const exec = (command, args, { stdio = "inherit", ...options } = {}) => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio, ...options });

    child.on("close", code => {
      if (code !== 0) {
        reject({
          command: `${command} ${args.join(" ")}`
        });
        return;
      }
      resolve();
    });
  });
};

const readFile = util.promisify(fs.readFile);

const appendFile = util.promisify(fs.appendFile);

const writeFile = util.promisify(fs.writeFile);

const copyFile = util.promisify(fs.copyFile);

const mkdir = util.promisify(fs.mkdir);

const args = process.argv.slice(2);

const validateNotEmpty = str => {
  if (str.length > 0) return true;
  return "Should not be empty";
};

const serializeEnv = parsed =>
  Object.keys(parsed)
    .map(key => `${key.toUpperCase()}=${parsed[key]}`)
    .join("\n");

const getEnvVars = async () => {
  let defaultEnvVars = {};
  try {
    defaultEnvVars = JSON.parse(await readFile(configHomeJsonPath));
  } catch (_err) {}
  return inquirer.prompt([
    {
      name: "directory",
      message: "Choose a name for your app:",
      validate: str => {
        const emptyValidation = validateNotEmpty(str);
        if (emptyValidation !== true) return emptyValidation;
        if (str.length > 30)
          return "App name cannot be longer than 30 characters.";
        if (!/^[a-z0-9_-\s]+$/i.test(str))
          return "App name must be alphanumeric and can contain underscores, hyphens and spaces.";
        return true;
      }
    },
    {
      name: "unparsedWeblibName",
      message: "Choose a name for the PeopleSoft weblib:",
      default: ({ directory }) => {
        return `WEBLIB_${directory
          .replace(/\s/g, "_")
          .replace(/[^a-z0-9_]/gi, "")
          .toUpperCase()
          .slice(0, 8)}`;
      },
      validate: str => {
        const emptyValidation = validateNotEmpty(str);
        if (emptyValidation !== true) return emptyValidation;
        if (str.length > 15)
          return "Weblib name cannot be longer than 15 characters.";
        if (str.toUpperCase().indexOf("WEBLIB_") !== 0)
          return `Weblib name must start with ${chalk.cyan("WEBLIB_")}.`;
        if (!/^[a-z0-9_]+$/i.test(str))
          return "Weblib must be alphanumeric and can contain underscores.";
        return true;
      }
    },
    {
      name: "PS_HOSTNAME",
      message: "What's the PeopleSoft hostname (Ex: dev-ps.example.com)?",
      default: defaultEnvVars.PS_HOSTNAME,
      validate: validateNotEmpty
    },
    {
      name: "PS_ENVIRONMENT",
      message: "What's the PeopleSoft site name (Ex: csdev, csprd)?",
      default: defaultEnvVars.PS_ENVIRONMENT,
      validate: validateNotEmpty
    },
    {
      name: "PS_NODE",
      message: "What's the PeopleSoft node (Ex: SA, HRMS)?",
      default: defaultEnvVars.PS_NODE,
      validate: validateNotEmpty
    },
    {
      name: "PS_USERNAME",
      message: "What's your PeopleSoft OPRID (Ex: PS)?",
      default: defaultEnvVars.PS_USERNAME,
      validate: validateNotEmpty
    },
    {
      name: "PS_PASSWORD",
      message: "What's your PeopleSoft OPRID password (Ex: PS)?",
      default: defaultEnvVars.PS_PASSWORD,
      validate: validateNotEmpty
    },
    {
      name: "has_http_auth",
      message: "Is your server under HTTP authentication?",
      type: "confirm",
      default: Boolean(
        defaultEnvVars.HTTP_USERNAME && defaultEnvVars.HTTP_PASSWORD
      )
    },
    {
      name: "HTTP_USERNAME",
      message: "What's your HTTP username?",
      when: ({ has_http_auth: hasHttpAuth }) => hasHttpAuth,
      default: defaultEnvVars.HTTP_USERNAME,
      validate: validateNotEmpty
    },
    {
      name: "HTTP_PASSWORD",
      message: "What's your HTTP password?",
      when: ({ has_http_auth: hasHttpAuth }) => hasHttpAuth,
      default: defaultEnvVars.HTTP_PASSWORD,
      validate: validateNotEmpty
    }
  ]);
};

getEnvVars().then(
  async ({
    has_http_auth: hasHttpAuth,
    unparsedWeblibName,
    directory,
    ...envVars
  }) => {
    const buildFolder = "dist";
    const weblibName = encodeURIComponent(unparsedWeblibName.toUpperCase());
    const appName = encodeURIComponent(directory);
    const psAppName = appName;
    const appNameNoSpaces = directory
      .replace(/\s/g, "_")
      .replace(/[^a-z]/gi, "")
      .toLowerCase();
    const psAppHtmlName = `h_${appNameNoSpaces}`.toUpperCase();
    try {
      await mkdir(directory);
      await mkdir(`${directory}/src`);
      await copyFile(`${__dirname}/config/README.md`, `${directory}/README.md`);
      await copyFile(
        `${__dirname}/config/index.js`,
        `${directory}/src/index.js`
      );
      await copyFile(
        `${__dirname}/config/styles.css`,
        `${directory}/${appNameNoSpaces}.css`
      );
      await writeFile(
        `${directory}/${appNameNoSpaces}.html`,
        generateHtml(appNameNoSpaces)
      );
      await writeFile(
        `${directory}/.gitignore`,
        generateGitIgnore({ buildFolder })
      );
      await writeFile(
        `${directory}/package.json`,
        generateJson({ buildFolder, hasHttpAuth, appName: appNameNoSpaces })
      );
      await writeFile(
        `${directory}/webpack.config.js`,
        generateWebpackConfig({
          buildFolder,
          appName: appNameNoSpaces
        })
      );
      await writeFile(`${directory}/.env`, serializeEnv(envVars));
      await writeFile(
        configHomeJsonPath,
        JSON.stringify(
          {
            PS_HOSTNAME: envVars.PS_HOSTNAME,
            PS_ENVIRONMENT: envVars.PS_ENVIRONMENT,
            PS_NODE: envVars.PS_NODE,
            PS_USERNAME: envVars.PS_USERNAME,
            PS_PASSWORD: envVars.PS_PASSWORD,
            HTTP_USERNAME: envVars.HTTP_USERNAME,
            HTTP_PASSWORD: envVars.HTTP_PASSWORD
          },
          null,
          2
        )
      );

      const request = Request.defaults({
        headers: { "User-Agent": "request" },
        jar: await getToken(envVars),
        resolveWithFullResponse: true
      });
      const authOptions = {
        user: envVars.HTTP_USERNAME,
        pass: envVars.HTTP_PASSWORD
      };

      const uri = `https://${envVars.PS_HOSTNAME}/psc/${envVars.PS_ENVIRONMENT}/EMPLOYEE/${envVars.PS_NODE}/s/WEBLIB_H_DEV.ISCRIPT1.FieldFormula.IScript_CreatePSApp?postDataBin=y&appName=${psAppName}&weblibName=${weblibName}&htmlObjectName=${psAppHtmlName}`;

      const options = {
        method: "POST",
        uri
      };
      if (hasHttpAuth) options.auth = authOptions;

      const response = await request(options);
      if (response.statusCode !== 200)
        throw new Error("Failed to create PeopleSoft app.");
      let appUrl = `https://${envVars.PS_HOSTNAME}/psc/${envVars.PS_ENVIRONMENT}/EMPLOYEE/${envVars.PS_NODE}/s/{weblibName}.ISCRIPT1.FieldFormula.IScript_Main`;
      let localDevHeaderName = `X-${appNameNoSpaces}-Asset-Url`;
      try {
        const jsonResponse = JSON.parse(response.body);
        appUrl = jsonResponse.appUrl;
        localDevHeaderName = jsonResponse.localDevHeaderName;
      } catch (err) {
        if (!response.body.includes("already exists")) throw err; // if app exists we'll use it
      }

      const devDependencies = [
        "@highpoint/send-to-peoplesoft",
        "webpack",
        "webpack-cli",
        "webpack-dev-server"
      ];
      const dependencies = ["react", "react-dom"];

      const cwd = path.resolve(directory);
      await exec("yarn", [], { cwd });
      await exec("yarn", ["add", "--dev", ...devDependencies], { cwd });
      await exec("yarn", ["add", ...dependencies], { cwd });
      await exec("yarn", ["build"], { cwd });
      await exec("yarn", ["deploy"], { cwd });
      openBrowser(appUrl);

      console.log(`\n${chalk.green("That's it!\n")}`);

      console.log(
        `Now ${chalk.grey("cd")} to ${chalk.green(
          directory
        )} and run ${chalk.grey(
          "yarn deploy"
        )} to send your JS and CSS assets to your PeopleSoft server.\n`
      );
      console.log(`Your app is now live at ${chalk.blue(appUrl)}.\n`);
    } catch (err) {
      console.error("Something went wrong.");
      console.error(err);
      process.exit(1);
    }
  }
);
