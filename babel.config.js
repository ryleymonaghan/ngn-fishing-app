module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@':           './src',
            '@constants':  './src/constants',
            '@app-types':  './src/types',
            '@stores':     './src/stores',
            '@services':   './src/services',
            '@hooks':      './src/hooks',
            '@components': './src/components',
            '@lib':        './src/lib',
          },
        },
      ],
    ],
  };
};
