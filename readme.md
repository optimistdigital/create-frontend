# Create Frontend [![Build Status](https://api.travis-ci.org/optimistdigital/create-frontend.svg?branch=master)](https://travis-ci.org/optimistdigital/create-frontend)

This toolkit generates your project's frontend build system. It uses Webpack
under the hood.

## Features

-   JS (Babel, Eslint, Core-JS, Flow, JSX). Can import relative to project
    root: `import x from 'client/js/y'`
-   SCSS with autoprefixer, normalize.css. Images can be imported relative to project root with tilde: `background-image: url('~client/images/logo.svg')`
-   Hot reload for development
-   Works with zero configuration, but customization is possible if needed
-   Usable with any backend.
-   `.html` files are built from `/client/html` by default, with assets automatically linked.

## Usage

1. In Bash, navigate into your project directory
2. Type `npx @optimistdigital/create-frontend` and follow the instructions. You may also specify flags:
    - `--template=react` - Generates a React boilerplate
    - `--template=universal-react` - Generates a React boilerplate that renders on client and server (using Node.js). [Documentation here](docs/universal-react.md)
    - `-y` - Skips user confirmation (assume yes)

### CLI

-   `npm run dev` - Start a webpack server for development
-   `npm run build` - Build assets for production
-   `npm run build:debug` - Build assets with debug logs. In JS, `__DEBUG__` will
    be [transformed](https://webpack.js.org/plugins/define-plugin/) to `true`

There are also flags to customize the dev environment:

-   `npm run dev -- --webpackPort=8000` - Custom port for dev server
-   `npm run dev -- --webpackDomain=localhost` - Custom domain for dev server
-   `npm run dev -- --protocol=https` - Run the dev server with https

### Configuration

Configuration can be done in two places:

-   In your `package.json` under the `create-frontend` property. Since this is a JSON file, not all configuration is going to be possible.

```
{
    "create-frontend": { "publicDirectory": "public" }
}
```

-   In the `create-frontend.conf.js` file that you can create in your project root. Use this if you need more complex expressions or JSON isn't enough.

```
module.exports = { "publicDirectory": "public" }
```

Here are all the options (default in parens):

-   `publicDirectory` (_public_) - Project's public root. Relative to project
    root.
-   `buildPath` (_build_) - Where the build files will go. Relative to the public
    directory.
-   `hashFileNames` (_true_) - Whether or not filenames should be hashed in
    production (e.g `app-503dcc37.js`). An `asset-manifest.json` file will be
    generated either way.
-   `htmlPath` (_client/html_) - Html files from this directory will be built
    into the public directory with [html-webpack-plugin](https://github.com/jantimon/html-webpack-plugin).
-   `htmlOptions` (_{}_) - Options that will get passed to html-webpack-plugin
-   `entryPoints` - Object/string/array that contains the
    [entry points](https://webpack.js.org/concepts/entry-points/) for your
    application. Relative to project root. Default:
    ```js
    {
        app: 'client/js/entry.js',
    }
    ```
-   `appendPlugins` - Function that returns an array of Webpack plugins. Appended to the end
    of the plugins array.
-   `prependRules` - Function that returns an array of Webpack rules. The first one to match
    will be used
    ([oneOf](https://webpack.js.org/configuration/module/#rule-oneof)). These take precedence over default rules - if your custom rule matches, the default ones will not be used.
-   `editConfig` - Function that can be used to return a customized version of the Webpack config.
    First argument is the webpack config that is generated by Create Frontend. Use this as an escape hatch to customize the Webpack config directly.
-   `editDevServerConfig` - Function that can be used to return a customized version of the [Webpack Dev Server config](https://webpack.js.org/configuration/dev-server/).
-   `browserslist` (_['> 0.2%', 'last 1 version', 'not dead']_) - [Browsers list](https://github.com/browserslist/browserslist) that your app needs to support. Used by things like autoprefixer and babel-preset-env.

The `opts` parameter contains the following object: `{ IS_PRODUCTION: boolean, paths: Object, config: Object }`

### Using hot module replacement

[Hot module replacement](https://webpack.js.org/api/hot-module-replacement/) is
enabled for the app, however you must choose manually what you want to update
when changes are made. To do this, go into your `entry.js` file and uncomment
the relevant code.

## Updating

To update the local version of the toolkit, type `npm install @optimistdigital/create-frontend`. Please look at the changelog to see if there are any breaking changes.

The global version can be updated with `npm install -g @optimistdigital/create-frontend`, and will ensure that newly created projects use the latest version.
