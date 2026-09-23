const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-console': 'warn',
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'no-throw-literal': 'error',
      'prefer-const': 'warn',
      'no-var': 'error',
    },
  },
  {
    // Relax no-console for files that are migrating or run outside the server
    files: ['src/utils/**'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    ignores: ['node_modules/**', 'tests/**'],
  },
];
