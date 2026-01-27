import { config as reactConfig } from '@repo/configs/eslint/react';

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...reactConfig,
  {
    ignores: ['dist/**'],
  },
];
