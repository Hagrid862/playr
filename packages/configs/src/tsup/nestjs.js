import { baseConfig } from './base.js';

/** @type {import('tsup').Options} */
export const nestjsConfig = {
  ...baseConfig,
  entry: ['src/main.ts'],
  target: 'esnext',
  platform: 'node',
  outDir: 'dist',
  treeshake: true,
  splitting: false,
  publicDir: 'src/assets',
  tsconfig: './tsconfig.build.json',
  esbuildOptions(options) {
    options.keepNames = true;
  },
  external: [
    '@repo/db',
    '@repo/contracts',
    'crypto',
    'fs',
    'http',
    'https',
    'net',
    'os',
    'path',
    'stream',
    'util',
  ],
};
