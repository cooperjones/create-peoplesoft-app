module.exports = buildFolder => `
node_modules
.env
yarn-error.log
${buildFolder}
`;
