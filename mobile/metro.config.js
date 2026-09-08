const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Noble publishes both ESM and CommonJS builds. Metro on Windows can select the
// ESM build but then fail to resolve its relative imports (for example,
// `./utils.js`). Use Metro's stable legacy resolver so Noble's CommonJS build is
// selected consistently on Android, iOS, and Windows development machines.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
