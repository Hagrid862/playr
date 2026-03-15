import { baseConfig } from './base.js';

/** @type {import('tsup').Options} */
export const packagesConfig = {
  ...baseConfig,
  entry: ['src/index.ts'],
  dts: true,
};
