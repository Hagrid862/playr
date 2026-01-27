import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const baseConfig = require('@repo/configs/prettier');

/** @type {import('prettier').Config} */
export default {
  ...baseConfig,
};
