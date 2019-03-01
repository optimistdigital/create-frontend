const getConfig = require('../../config');

module.exports = args => {
  const serverConfig = getConfig('node');
  const serverPort = args.serverPort || serverConfig.DEFAULT_NODE_SERVER_PORT;
  /**
   * Initialize configuration
   */
  require('dotenv').load();
  process.env.NODE_ENV = 'production';

  /**
   * Handle errors
   */
  process.on('uncaughtException', err => {
    console.error(
      `${new Date().toUTCString()} uncaughtException:`,
      err.message
    );
    console.error(err.stack);
    process.exit(1);
  });

  process.on('unhandledRejection', err => {
    console.error(
      `${new Date().toUTCString()} unhandledRejection:`,
      err.message || err
    );
    console.error(err.stack);
    process.exit(1);
  });

  const serverPath = `${serverConfig.SERVER_BUILD_DIRECTORY}/${
    serverConfig.SERVER_OUTPUT_FILE
  }.js`;

  /**
   * Start server
   */
  const server = require(serverPath).default;
  server.listen(serverPort, () => {
    console.info(`✅  Server started at http://localhost:${serverPort}`);
  });
};