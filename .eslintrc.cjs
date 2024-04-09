module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  plugins: ['@typescript-eslint', 'prefer-arrow-functions'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ts: '@typescript-eslint/parser',
    js: 'espree',
    typescript: '@typescript-eslint/parser',
    sourceType: 'module',
    ecmaVersion: 2024,
    extraFileExtensions: ['.svelte'],
    ecmaFeatures: {
      globalReturn: false,
      impliedStrict: false,
      jsx: false
    }
  },
  rules: {
    '@typescript-eslint/sort-type-constituents': 'error',
    'no-console': ['error'],
    'prefer-template': ['error'],
    'prefer-arrow-functions/prefer-arrow-functions': [
      'error',
      {
        allowNamedFunctions: false,
        classPropertiesAllowed: false,
        disallowPrototype: false,
        returnStyle: 'implicit',
        singleReturnOnly: false
      }
    ]
  },
  ignorePatterns: [
    // Ignore dotfiles
    '.*.js',
    '.*.cjs',
    'ios/*',
    'build/*',
    'dist/',
    'node_modules/*',
    '**/*.yaml',
    '**/*.css',
    '**/*.scss',
    /**
     * SvelteKit TSConfig automatically ignores this:
     */
    'src/service-worker.js'
  ],
  overrides: [
    { files: ['*.cjs'], env: { node: true } },
    {
      files: ['*.ts'],
      rules: {
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-explicit-any': [
          'error',
          {
            fixToUnknown: false,
            ignoreRestArgs: true
          }
        ],
        '@typescript-eslint/explicit-function-return-type': ['error']
      }
    }
  ],
  env: {
    browser: true,
    es6: true,
    node: true
  },
  settings: {
    'import/resolver': {
      typescript: {
        project: './tsconfig.base.json',
        alwaysTryTypes: true // always try to resolve types under `<root>@types` directory even it doesn't contain any source code, like `@types/unist`
      }
    }
  }
};
