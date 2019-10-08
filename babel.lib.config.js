module.exports = {
  env: {
    production: {
      ignore: ['**/*.test.js'],
    },
  },
  plugins: [
    '@babel/plugin-transform-regenerator',
    '@babel/plugin-transform-runtime',
    'styled-components',
  ],
  presets: [
    '@babel/preset-react',
    [
      '@babel/preset-env',
      {
        modules: ['modules'].includes(process.env.BABEL_ENV)
          ? false
          : 'commonjs',
      },
    ],
  ],
};