# Create PeopleSoft App boilerplate

This project was created with create-peoplesoft-app.

Run `yarn build` to build the files ready to send to PeopleSoft.

Run `yarn deploy` to send all your JS and CSS assets in this folder to your PeopleSoft server.

Run `yarn start` to run the development server.

## Load assets from development server

1. Using a browser extension like [ModHeader](https://chrome.google.com/webstore/detail/modheader/idgpnmonknjnojddfkpgkljpfnnfcklj)
   or proxy like [Charles](https://www.charlesproxy.com/), add the following 
   request header & value to the requests: `X-<App-Name>-Asset-Url: https://localhost:8080/`. (<App-Name> is the name given to the create-peoplesoft-app npx script)
2. Run `yarn start`.

Once the request header is applied, reload the PeopleSoft page. The page's HTML source should now load the app javascript from your local web server instead of the database. Since the local webpack dev server is in watch mode, the page will automatically reload whenever you make edits to the src javascript.