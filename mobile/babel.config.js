module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            '@': './src',
            '@/theme': './src/theme/index',
            '@/api': './src/api',
            '@/store': './src/store',
            '@/components': './src/components',
            '@/hooks': './src/hooks',
            '@/types': './src/types',
            '@/utils': './src/utils',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
