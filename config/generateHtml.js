module.exports = appName => `<html lang="en" dir="ltr">
  <head>
    <meta charset="utf-8" />
    <title>demo app</title>
    <link rel="stylesheet" href="${appName}.css" />
  </head>
  <body>
    <div id="app"></div>
    <script type="text/javascript" src="${appName}_vendor.js"></script>
    <script type="text/javascript" src="${appName}_app.js"></script>
  </body>
</html>`;
