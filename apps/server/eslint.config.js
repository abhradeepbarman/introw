import { config } from '@repo/eslint-config/node';

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...config,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
