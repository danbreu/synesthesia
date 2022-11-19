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

### Documentation
To build the documentation run: `npm run doc`
The documentation will be located in the *doc* folder.

## Structure
The *public* folder is statically served by express.

The application code itself is located in the *src* folder. With app.js being the main entrypoint.
