/**
 * Yordle - A URL shortener for Google App Engine.
 * Copyright (C) 2021 The Yordle Team
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 */

module.exports = {
  ignorePatterns: ['src/locale-codes.ts'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'eslint-config-prettier',
    '@open-wc/eslint-config',
  ],
  env: {
    browser: true,
    node: true,
  },
  plugins: ['jest', '@typescript-eslint'],
  rules: {
    'import/extensions': 'off',
    'import/no-unresolved': 'off',
    'implicit-arrow-linebreak': 'off',
    'no-unused-vars': 'off',
    'operator-linebreak': ['error', 'before', { overrides: { '=': 'after' } }],
  },
  overrides: [
    {
      files: ['*.ts'],
      plugins: ['jest'],
      parser: '@typescript-eslint/parser',
      rules: {
        'no-shadow': 'off',
      },
    },
    {
      files: ['*.mjs'],
      extends: ['eslint-config-prettier', '@open-wc/eslint-config'],
      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 12,
      },
    },
  ],
};
