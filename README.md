# Synesthesia
## Installation
1. Pull repository
2. run `npm ci`

## Usage
### Server
To start the web-server run: `npm start`
The application is then reachable under [http://localhost:3000/](http://localhost:3000/).

### Bundler
To bundle new javascript code run: `npm run bundle`
This script will automatically move the **bundle.js** to the public folder.

### Linter
To lint the javascript files (including the style) run: `npm run lint`
If you want to automatically fix the issues (if possible) run: `npm run lint-fix`

## Minify
To minify the bundle run: `npm run minify`
It will shrink the size of the bundle by about 30%. But will make debugging in the browser harder.

## Structure
The *public* folder is statically served by express.

The application code itself is located in the *src* folder. With app.js being the main entrypoint.
