const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable Fast Refresh for hot reloading
config.transformer.unstable_allowRequireContext = true;

// Add Android-specific optimizations
config.resolver.platforms = ['android', 'ios', 'web'];

// Add WASM support for expo-sqlite
config.resolver.assetExts.push('wasm');

// Optimize bundle splitting for Android
config.transformer.minifierConfig = {
  keep_classnames: true,
  keep_fnames: true,
  mangle: {
    keep_classnames: true,
    keep_fnames: true,
  },
};

// Add SQLite native module resolution for Android
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Enable hot reloading optimizations
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware, server) => {
    return middleware;
  },
};

// Watch for file changes more efficiently
config.watchFolders = [__dirname];

module.exports = config;
