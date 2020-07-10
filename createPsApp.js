#!/usr/bin/env node

const inquirer = require("inquirer");
const chalk = require("chalk");
const fs = require("fs");
const util = require("util");
const packageJson = require("./package.json");

const currentNodeVersion = process.versions.node;
const semver = currentNodeVersion.split(".");
const major = semver[0];

if (major < 12) {
  console.error(
    "You are running Node " +
      currentNodeVersion +
      ".\n" +
      "Create PeopleSoft App requires Node 12 or higher. \n" +
      "Please update your version of Node."
  );
  process.exit(1);
}

const writeFile = util.promisify(fs.writeFile);

const copyFile = util.promisify(fs.copyFile);

const mkdir = util.promisify(fs.mkdir);

const args = process.argv.slice(2);

const directory = args[0];

if (!directory) {
  console.error("Please specify the project directory:");
  console.log(
    `  ${chalk.cyan("create-peoplesoft-app")} ${chalk.green(
      "<project-directory>"
    )}`
  );
  process.exit(1);
}

const validate = str => str.length > 0;

const serializeEnv = parsed =>
  Object.keys(parsed)
    .map(key => `${key.toUpperCase()}=${parsed[key]}`)
    .join("\n");

const createDir = async () => {
  try {
    return mkdir(directory);
  } catch (err) {
    console.error(`Could not create ${chalk.green(directory)} directory.`);
    process.exit(1);
  }
};

const getEnvVars = () =>
  inquirer.prompt([
    {
      name: "ps_hostname",
      message: "What's the PeopleSoft hostname?",
      validate
    },
    {
      name: "ps_environment",
      message: "What's the PeopleSoft environment?",
      validate
    },
    {
      name: "ps_node",
      message: "What's the PeopleSoft node?",
      validate
    },
    {
      name: "ps_username",
      message:
        "What's your PeopleSoft username? (for sending files to PeopleSoft)",
      validate
    },
    {
      name: "ps_password",
      message: "What's your PeopleSoft password?",
      validate
    },
    {
      name: "has_http_auth",
      message: "Is your server under HTTP authentication?",
      type: "confirm",
      default: false
    },
    {
      name: "http_username",
      message: "What's your HTTP username?",
      when: ({ has_http_auth: hasHttpAuth }) => hasHttpAuth
    },
    {
      name: "http_password",
      message: "What's your HTTP password?",
      when: ({ has_http_auth: hasHttpAuth }) => hasHttpAuth
    }
  ]);

const filesToCopy = ["package.json", "README.md", "index.js"];
const copyFiles = () =>
  Promise.all(
    filesToCopy.map(file =>
      copyFile(`${__dirname}/${file}`, `${directory}/${file}`)
    )
  );

const copyJson = hasHttpAuth => {
  const newJson = {
    ...packageJson,
    scripts: {
      deploy: `send-to-peoplesoft -d .${hasHttpAuth ? " --with-auth" : ""}`
    },
    dependencies: Object.fromEntries(
      Object.entries(packageJson.dependencies).filter(
        ([dep]) => !["chalk", "inquirer"].includes(dep)
      )
    )
  };
  return writeFile(
    `${directory}/package.json`,
    JSON.stringify(newJson, null, 2)
  );
};

getEnvVars().then(async ({ has_http_auth: hasHttpAuth, ...envVars }) => {
  try {
    await createDir();
    await copyFiles();
    await copyJson(hasHttpAuth);
    await writeFile(`${directory}/.gitignore`, "node_modules\n.env");
    await writeFile(`${directory}/.env`, serializeEnv(envVars));

    console.log(
      `That's it! Now ${chalk.grey("cd")} to ${chalk.green(
        directory
      )} and run ${chalk.grey("yarn")} and ${chalk.grey(
        "yarn deploy"
      )} to send your JS and CSS assets to your PeopleSoft server.`
    );
  } catch (err) {
    console.error("Something went wrong.");
    console.error(err);
    process.exit(1);
  }
});
