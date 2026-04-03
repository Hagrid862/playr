import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/main.ts'],
  format: ['esm'],
  target: 'esnext',
  platform: 'node',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  treeshake: true,
  splitting: false,
  publicDir: 'src/assets',
  // Path aliases from tsconfig
  tsconfig: './tsconfig.build.json',
  // Keep class names for Nest DI
  esbuildOptions(options) {
    options.keepNames = true;
  },
  // Externalize workspace packages (they're built separately)
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
});
