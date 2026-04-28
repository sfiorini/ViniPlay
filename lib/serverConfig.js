const { resolveRuntimePaths } = require('./paths');

function resolveServerConfig(env = process.env, appDir = __dirname) {
  return {
    port: Number(env.PORT || 8998),
    paths: resolveRuntimePaths(env, appDir)
  };
}

module.exports = { resolveServerConfig };
