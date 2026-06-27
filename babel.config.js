module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    // NOTE: react-native-reanimated/plugin is injected by `nativewind/babel`
    // (via react-native-css-interop). Do not add it again here or Babel throws
    // a duplicate-plugin error.
  };
};
