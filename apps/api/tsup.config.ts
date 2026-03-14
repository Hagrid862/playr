import { createRequire } from 'module';
import { defineConfig } from 'tsup';

const require = createRequire(import.meta.url);

export default defineConfig({
  entry: ['src/main.ts'],
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  treeshake: true,
  splitting: false,
  // Path aliases from tsconfig
  tsconfig: './tsconfig.build.json',
  // Keep class names for Nest DI
  esbuildOptions(options) {
    options.keepNames = true;
  },
  // Externalize workspace packages (they're built separately)
  external: ['@repo/db', '@repo/contracts'],
  // Ensure reflect-metadata is loaded first (Nest requirement)
  esbuildPlugins: [
    {
      name: 'reflect-metadata-first',
      setup(build) {
        build.onResolve({ filter: /^reflect-metadata$/ }, () => ({
          path: require.resolve('reflect-metadata'),
          sideEffects: true,
        }));
      },
    },
  ],
});