import { config as baseConfig } from "./base.js";

/**
 * A shared ESLint configuration for packages.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const config = [
  ...baseConfig,
  {
    files: ["**/*.ts"],
    rules: {
      "no-console": "warn",
    },
  },
];
