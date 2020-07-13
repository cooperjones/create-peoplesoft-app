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

const currentNodeVersion = process.versions.node;
const semver = currentNodeVersion.split(".");
const major = semver[0];

if (major < 10) {
  console.error(
    "You are running Node " +
      currentNodeVersion +
      ".\n" +
      "Create PeopleSoft App requires Node 12 or higher. \n" +
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

const validate = str => str.length > 0;

const serializeEnv = parsed =>
  Object.keys(parsed)
    .map(key => `${key.toUpperCase()}=${parsed[key]}`)
    .join("\n");

const createDir = async directory => {
  try {
    await mkdir(directory);
    return true;
  } catch (err) {
    if (err.code === "EEXIST") return false; // keep doing tasks if directory exists
    console.error(`Could not create ${chalk.green(directory)} directory.`);
    process.exit(1);
  }
};

const getEnvVars = () =>
  inquirer.prompt([
    {
      name: "unparsedAppName",
      message: "Choose a name for your app:",
      validate: str => {
        return validate(str) && !/\d/.test(str);
      }
    },
    {
      name: "PS_HOSTNAME",
      message: "What's the PeopleSoft hostname (Ex: dev-ps.example.com)?",
      validate
    },
    {
      name: "PS_ENVIRONMENT",
      message: "What's the PeopleSoft site name (Ex: csdev, csprd)?",
      validate
    },
    {
      name: "PS_NODE",
      message: "What's the PeopleSoft node (Ex: SA, HRMS)?",
      validate
    },
    {
      name: "PS_USERNAME",
      message: "What's your PeopleSoft OPRID (Ex: PS)?",
      validate
    },
    {
      name: "PS_PASSWORD",
      message: "What's your PeopleSoft OPRID password (Ex: PS)?",
      validate
    },
    {
      name: "has_http_auth",
      message: "Is your server under HTTP authentication?",
      type: "confirm",
      default: false
    },
    {
      name: "HTTP_USERNAME",
      message: "What's your HTTP username?",
      when: ({ has_http_auth: hasHttpAuth }) => hasHttpAuth
    },
    {
      name: "HTTP_PASSWORD",
      message: "What's your HTTP password?",
      when: ({ has_http_auth: hasHttpAuth }) => hasHttpAuth
    }
  ]);

const copyFiles = directory => {
  const filesToCopy = [
    { from: "README.md", to: "README.md" },
    { from: "index.js", to: `${directory}.js` }
  ];
  return Promise.all(
    filesToCopy.map(({ from, to }) =>
      copyFile(`${__dirname}/${from}`, `${directory}/${to}`)
    )
  );
};

const copyJson = async ({ directory, hasHttpAuth }) => {
  const destination = `${directory}/package.json`;
  let existingContents = {
    scripts: {},
    devDependencies: {}
  };
  try {
    existingContents = JSON.parse(await readFile(destination));
  } catch (_err) {
    // if it failed reading for whatever reason, assume it has no contents and override it.
  }
  const deploy = `send-to-peoplesoft -d .${hasHttpAuth ? " --with-auth" : ""}`;
  const sendToPsDep = "@highpoint/send-to-peoplesoft";
  const newJson = {
    name: "my-peoplesoft-app",
    version: "0.1.0",
    description: "app bootstrapped with Create PeopleSoft App",
    main: `${directory}.js`,
    ...existingContents,
    scripts: {
      ...existingContents.scripts,
      deploy
    },
    devDependencies: {
      ...existingContents.devDependencies,
      [sendToPsDep]: packageJson.dependencies[sendToPsDep]
    }
  };

  return writeFile(destination, JSON.stringify(newJson, null, 2));
};

getEnvVars().then(
  async ({ has_http_auth: hasHttpAuth, unparsedAppName, ...envVars }) => {
    const directory = unparsedAppName.replace(/\s+/g, "_").toLowerCase();
    const psAppName = directory.toUpperCase();
    try {
      const isNewDir = await createDir(directory);
      if (isNewDir) {
        await copyFiles(directory);
      }
      await copyJson({ directory, hasHttpAuth });
      if (isNewDir) {
        await writeFile(`${directory}/.gitignore`, "node_modules\n.env");
      }
      await writeFile(`${directory}/.env`, serializeEnv(envVars));

      const request = Request.defaults({
        headers: { "User-Agent": "request" },
        jar: await getToken(envVars),
        resolveWithFullResponse: true
      });
      const authOptions = {
        user: envVars.HTTP_USERNAME,
        pass: envVars.HTTP_PASSWORD
      };

      const uri = `https://${envVars.PS_HOSTNAME}/psc/${envVars.PS_ENVIRONMENT}/EMPLOYEE/${envVars.PS_NODE}/s/WEBLIB_H_DEV.ISCRIPT1.FieldFormula.IScript_CreatePSApp?postDataBin=y&appName=${psAppName}`;

      const options = {
        method: "POST",
        uri
      };
      if (hasHttpAuth) options.auth = authOptions;

      const response = await request(options);
      if (response.statusCode !== 200)
        throw new Error("Failed to create PeopleSoft app.");
      let appUrl = `https://${envVars.PS_HOSTNAME}/psc/${envVars.PS_ENVIRONMENT}/EMPLOYEE/${envVars.PS_NODE}/s/WEBLIB_${psAppName}.ISCRIPT1.FieldFormula.IScript_Main`;
      let localDevHeaderName = `X-${psAppName}-Asset-Url`;
      try {
        const jsonResponse = JSON.parse(response.body);
        appUrl = jsonResponse.appUrl;
        localDevHeaderName = jsonResponse.localDevHeaderName;
      } catch (err) {
        if (!response.body.includes("already exists")) throw err; // if app exists we'll use it
      }

      const cwd = path.resolve(directory);
      await exec("yarn", [], { cwd });
      await exec("yarn", ["deploy"], { cwd });

      console.log(`\n${chalk.green("That's it!\n")}`);

      console.log(
        `Now ${chalk.grey("cd")} to ${chalk.green(
          directory
        )} and run ${chalk.grey(
          "yarn deploy"
        )} to send your JS and CSS assets to your PeopleSoft server.\n`
      );
      console.log(`Your app is now live at ${chalk.blue(appUrl)}.\n`);
      console.log(
        `You can use ${chalk.green(
          localDevHeaderName
        )} request header in your app to load assets from a custom URL instead of the PeopleSoft server.`
      );
      console.log(
        `This is useful for development. Read more about it here: ${chalk.blue(
          "https://cooperjones.github.io/hpt-docs/?path=/docs/welcome-installation--page"
        )}`
      );
    } catch (err) {
      console.error("Something went wrong.");
      console.error(err);
      process.exit(1);
    }
  }
);
