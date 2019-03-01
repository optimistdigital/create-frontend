const chalk = require('chalk');
const CleanPlugin = require('clean-webpack-plugin');
const ExtractPlugin = require('mini-css-extract-plugin');
const ManifestPlugin = require('webpack-assets-manifest');
const webpack = require('webpack');
const getConfig = require('../config');
const getBabelOpts = require('./getBabelOpts');
const getPostCssOpts = require('./getPostCssOpts');
const readFiles = require('fs-readdir-recursive');
const HtmlPlugin = require('html-webpack-plugin');
const path = require('path');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const nodeExternals = require('webpack-node-externals');
const StartServerPlugin = require('start-server-webpack-plugin');
const { resolveApp, resolveOwn } = require('../paths');

/**
 * @param {string} target - webpack target (web/node)
 */
module.exports = target => {
  /**
   * Set NODE_ENV to production as a fallback, if it hasn't been set by something else
   */
  process.env.NODE_ENV = process.env.NODE_ENV || 'production';

  const IS_PRODUCTION = process.env.NODE_ENV === 'production';
  const IS_WEB = target === 'web';
  const IS_NODE = target === 'node';
  const config = getConfig(target);
  const WEBPACK_CONF_PARAMS = { IS_PRODUCTION, config, target };
  const OUTPUT_PATH = IS_NODE
    ? config.SERVER_BUILD_DIRECTORY
    : config.BUILD_DIRECTORY;

  const output = {};

  /**
   * Mode: production/development
   */
  output.mode = IS_PRODUCTION ? 'production' : 'development';

  /**
   * Target: Different for server/client
   */
  output.target = target;

  /**
   * Externals: Ignore node_modules in the bundle
   */
  if (IS_NODE) {
    output.externals = nodeExternals({
      whitelist: [
        'webpack/hot/poll?300',
        /^@optimistdigital\/create-frontend\/universal-react\/.*/,
      ],
    });
  }

  /* Enable watch mode in dev node server */
  if (IS_NODE && !IS_PRODUCTION) {
    output.watch = true;
  }

  /**
   * Devtool: Keep sourcemaps for development only.
   * This devtool is fast, but no column mappings.
   * Comparison: https://webpack.github.io/docs/build-performance.html#sourcemaps
   */
  if (IS_PRODUCTION) {
    output.devtool =
      IS_WEB && IS_PRODUCTION && config.ENABLE_PROD_SOURCEMAPS
        ? 'source-map'
        : false;
  } else {
    output.devtool =
      IS_WEB && !IS_PRODUCTION && config.ENABLE_DEV_SOURCEMAPS
        ? 'eval-cheap-module-source-map'
        : false;
  }

  /**
   * Optimization
   */
  // output.optimization = {
  //   minimize: false,
  // };
  if (IS_PRODUCTION) {
    output.optimization = {
      minimizer: [
        new UglifyJsPlugin({
          sourceMap: config.ENABLE_PROD_SOURCEMAPS,
          uglifyOptions: {
            compress: {
              warnings: false,
              drop_console: IS_WEB && !config.IS_DEBUG,
            },
            output: { comments: false },
          },
        }),
      ],
    };
  }

  /**
   * Context: Make context be root dir
   */
  output.context = config.APP_DIRECTORY;

  /**
   * Entry: Production uses separate entry points for CSS assets, development has only 1 bundle
   */

  const DEV_ENTRY_CONF = IS_NODE
    ? ['webpack/hot/poll?300']
    : [
        `${require.resolve('webpack-dev-server/client')}?${
          config.WEBPACK_SERVER
        }`,
        require.resolve('webpack/hot/only-dev-server'),
      ];

  const DEV_ENTRY_POINTS = {};

  const entryPoints = IS_NODE
    ? { [config.SERVER_OUTPUT_FILE]: config.SERVER_ENTRY_POINT }
    : config.ENTRY_POINTS;

  Object.keys(entryPoints).forEach(key => {
    DEV_ENTRY_POINTS[key] = [...DEV_ENTRY_CONF, entryPoints[key]];
  });

  output.entry = IS_PRODUCTION ? entryPoints : DEV_ENTRY_POINTS;

  /**
   * Output
   */
  output.output = {
    libraryTarget: IS_NODE ? 'commonjs2' : 'var',
    path: OUTPUT_PATH,
    filename:
      IS_PRODUCTION && IS_WEB && config.HASH_FILENAMES
        ? '[name]-[chunkhash].js'
        : '[name].js',
    chunkFilename: '[name].js',
    publicPath: IS_PRODUCTION
      ? `/${config.BUILD_PATH}/`
      : `${config.WEBPACK_SERVER}/`,
  };

  /**
   * Resolve: We use the project root to import modules in JS absolutely, in addition to node_modules
   */

  output.resolve = {
    modules: ['.', resolveApp('node_modules'), resolveOwn('node_modules')],
    extensions: ['.mjs', '.json', '.js', '.jsx', '.vue', '.css'],
  };

  /**
   * Stats: In non-debug mode, we don't want to pollute the terminal with stats in case some errors would be missed
   */

  output.stats = config.IS_DEBUG ? 'verbose' : 'errors-only';

  /**
   * Module: Mainly for loaders. Some loaders are shared, others are specific to dev/prod
   */

  const developmentRules = [
    // JS
    {
      test: /\.(js|js|mjs)$/,
      exclude: /node_modules/,
      use: [
        {
          loader: require.resolve('babel-loader'),
          options: getBabelOpts(WEBPACK_CONF_PARAMS),
        },
        { loader: require.resolve('eslint-loader') },
      ],
    },
    // SCSS
    {
      test: /\.(sass|scss)$/,
      use: [
        // Disable style-loader for node (doesn't work)
        !IS_NODE && { loader: require.resolve('style-loader') },
        {
          loader: require.resolve('css-loader'),
          options: {
            importLoaders: 1,
            sourceMap: config.ENABLE_DEV_SOURCEMAPS,
          },
        },
        {
          loader: require.resolve('postcss-loader'),
          options: getPostCssOpts(WEBPACK_CONF_PARAMS),
        },
        { loader: require.resolve('resolve-url-loader') }, // Resolves relative paths in url() statements based on the original source file.
        {
          loader: require.resolve('sass-loader'),
          options: {
            outputStyle: 'expanded',
            sourceMap: true, // resolve-url-loader always needs a sourcemap
          },
        },
      ].filter(Boolean),
    },
  ];

  const productionRules = [
    // JS
    {
      test: /\.(js|js|mjs)$/,
      exclude: /node_modules/,
      use: [
        {
          loader: require.resolve('babel-loader'),
          options: getBabelOpts(WEBPACK_CONF_PARAMS),
        },
      ],
    },
    // SCSS - extract from bundle with ExtractPlugin
    {
      test: /\.(sass|scss)$/,
      use: [
        ExtractPlugin.loader,
        {
          loader: require.resolve('css-loader'),
          options: {
            importLoaders: 1,
            sourceMap: config.ENABLE_PROD_SOURCEMAPS,
          },
        },
        {
          loader: require.resolve('postcss-loader'),
          options: getPostCssOpts(WEBPACK_CONF_PARAMS),
        },
        { loader: require.resolve('resolve-url-loader') }, // Resolves relative paths in url() statements based on the original source file.
        {
          loader: require.resolve('sass-loader'),
          options: {
            outputStyle: 'compressed',
            sourceMap: true, // resolve-url-loader always needs a sourcemap
          },
        },
      ],
    },
  ];

  output.module = {
    rules: [
      {
        oneOf: [
          ...(config.PREPEND_RULES(WEBPACK_CONF_PARAMS) || []),
          // Inline small images instead of creating separate assets
          {
            test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
            loader: require.resolve('url-loader'),
            options: {
              emitFile: IS_WEB,
              limit: 10000,
              name: config.HASH_FILENAMES
                ? '[name].[hash:8].[ext]'
                : '[name].[ext]',
            },
          },
          // Add production / development specific rules
          ...(IS_PRODUCTION ? productionRules : developmentRules),
          {
            test: [/\.html$/],
            loader: require.resolve('html-loader'),
            options: {},
          },
          // If nothing matched, use file-loader.
          // Except in the cases of js/json to allow webpack's default loaders to handle those.
          {
            loader: require.resolve('file-loader'),
            exclude: [/\.js$/, /\.json$/],
            options: {
              emitFile: IS_WEB,
              name: config.HASH_FILENAMES
                ? '[name].[hash:8].[ext]'
                : '[name].[ext]',
            },
          },
        ],
      },
    ],
  };

  /**
   * Plugins: Some plugins are shared, others are specific to dev/prod
   */
  const PAGE_FILES = readFiles(config.HTML_PATH);
  output.plugins = [
    /* SHARED PLUGINS */
    ...PAGE_FILES.map(
      pageFile =>
        new HtmlPlugin(
          Object.assign({}, config.HTML_OPTIONS, {
            template: path.resolve(config.HTML_PATH, pageFile),
            // For production, we want the html to be generated into the public directory.
            // For development, we are serving the build directory, so we put the html there instead
            filename: IS_PRODUCTION
              ? path.join(
                  config.PUBLIC_DIRECTORY,
                  path.dirname(pageFile),
                  `${path.basename(pageFile, path.extname(pageFile))}.html`
                )
              : path.join(
                  path.dirname(pageFile),
                  `${path.basename(pageFile, path.extname(pageFile))}.html`
                ),
          })
        )
    ),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      __DEVELOPMENT__: !IS_PRODUCTION,
      __PRODUCTION__: IS_PRODUCTION,
      __DEBUG__: process.env.APP_DEBUG === 'true',
      __OCF_MANIFEST_PATH__: JSON.stringify(config.MANIFEST_PATH),
    }),
  ];

  /* SHARED WEB PLUGINS */
  if (IS_WEB) {
    output.plugins.push(
      new ManifestPlugin({
        output: config.MANIFEST_PATH,
        publicPath: true,
        writeToDisk: true,
      })
    );
  }

  /* DEBUG PLUGINS */
  if (config.IS_DEBUG) {
    output.plugins.push(
      new (require('webpack-visualizer-plugin'))({
        filename: './stats.html',
      })
    );
  }

  /* PRODUCTION PLUGINS */
  if (IS_PRODUCTION) {
    output.plugins.push(
      new CleanPlugin([OUTPUT_PATH], {
        root: config.APP_DIRECTORY,
      }), // Clean previously built assets before making new bundle
      new webpack.IgnorePlugin(/\.\/dev/, /\/config$/), // Ignore dev config
      new ExtractPlugin({
        // Extract css files from bundles
        filename: config.HASH_FILENAMES
          ? '[name]-[contenthash].css'
          : '[name].css',
      })
    );
  }

  /* DEVELOPMENT PLUGINS */
  if (!IS_PRODUCTION) {
    output.plugins.push(
      new webpack.NamedModulesPlugin(), // Named modules for HMR
      new webpack.HotModuleReplacementPlugin(),
      new webpack.NoEmitOnErrorsPlugin(),
      new (require('./plugins/BuildDonePlugin'))(
        chalk.green.bold('\n=== Build for ' + target + ' done === \n')
      )
    );
  }

  /* USER DEFINED PLUGINS */
  output.plugins.push(...(config.APPEND_PLUGINS(WEBPACK_CONF_PARAMS) || []));

  // Falls back to default conf if replacer function returns a falsy value
  return config.EDIT_CONFIG(output, WEBPACK_CONF_PARAMS) || output;
};