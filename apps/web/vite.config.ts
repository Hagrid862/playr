import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

import { tanstackRouter } from '@tanstack/router-plugin/vite';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    devtools(),
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    viteReact(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      jsmediatags: 'jsmediatags/dist/jsmediatags.min.js',
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@repo/contracts': fileURLToPath(
        new URL('../../packages/contracts/src/index.ts', import.meta.url),
      ),
      '@repo/db': fileURLToPath(
        new URL('../../packages/db/src/generated/prisma/browser.ts', import.meta.url),
      ),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/main.tsx',
        'src/routeTree.gen.ts',
        'src/setupTests.ts',
        'src/**/*.d.ts',
        'src/components/ui/**/*',
        'src/routes/**/*',
        'src/hooks/api/**/*',
        'src/components/landingPage.tsx',
        'src/components/app/Sidebar.tsx',
        'src/components/layout/sidebar-layout.tsx',
      ],
    },
    setupFiles: ['./src/setupTests.ts'],
  },
});
