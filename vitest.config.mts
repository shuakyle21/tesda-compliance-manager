import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      // Mirrors tsconfig.json's "@/*": ["./*"] path alias.
      '@': path.resolve(import.meta.dirname, '.'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
});
