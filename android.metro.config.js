// Android-specific build configuration
module.exports = {
  // Optimize for Android devices
  transformer: {
    minifierPath: 'metro-minify-terser',
    minifierConfig: {
      // Keep class names for better debugging on Android
      keep_classnames: true,
      keep_fnames: true,
      mangle: {
        keep_classnames: true,
        keep_fnames: true,
      },
      output: {
        ascii_only: true,
        quote_keys: true,
        wrap_iife: true,
      },
      sourceMap: {
        includeSources: false,
      },
    },
  },
  
  // Android-specific asset resolution
  resolver: {
    assetExts: ['bin', 'txt', 'jpg', 'png', 'json', 'gif', 'webp', 'svg'],
    sourceExts: ['js', 'json', 'ts', 'tsx', 'jsx'],
  },
};
