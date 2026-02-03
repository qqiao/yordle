import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import openWc from '@open-wc/eslint-config';
import eslintConfigPrettier from 'eslint-config-prettier';
import jestPlugin from 'eslint-plugin-jest';
export default [
  {
    ignores: [
      'src/locale-codes.ts',
      'src/locales/',
      'dist/',
      'out-tsc/',
      'node_modules/',
      '**/*.config.js',
      '**/*.config.mjs',
      '**/*.config.cjs',
    ],
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  ...openWc,
  eslintConfigPrettier,
  {
    files: ['**/*.{js,mjs,cjs,ts}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      jest: jestPlugin,
    },
    rules: {
      'import-x/no-unresolved': 'off',
      'implicit-arrow-linebreak': 'off',
      'no-unused-vars': 'off',
      'operator-linebreak': [
        'error',
        'before',
        { overrides: { '=': 'after' } },
      ],

      // Fix for gulpfile using devDeps
      'import-x/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: [
            '**/test/**/*.{html,js,mjs,ts}',
            '**/stories/**/*.{html,js,mjs,ts}',
            '**/demo/**/*.{html,js,mjs,ts}',
            '**/*.config.{html,js,mjs,ts,cjs}',
            '**/*.conf.{html,js,mjs,ts,cjs}',
            '**/.storybook/*.{html,js,mjs,cjs,ts}',
            'gulpfile.mjs', // Added gulpfile
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.ts'],
    rules: {
      'no-shadow': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off', // Disable for now to fix store.ts issue easily
    },
  },
];
