const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

const analyticsCoreRoot = path.resolve(__dirname, "../src/lib/analytics/core");

config.watchFolders = [...(config.watchFolders ?? []), analyticsCoreRoot];
config.resolver = {
  ...config.resolver,
  extraNodeModules: {
    ...(config.resolver?.extraNodeModules ?? {}),
    "@analytics-core": analyticsCoreRoot,
  },
  nodeModulesPaths: [
    ...(config.resolver?.nodeModulesPaths ?? []),
    path.resolve(__dirname, "node_modules"),
  ],
};

module.exports = withNativeWind(config, { input: "./global.css" });
