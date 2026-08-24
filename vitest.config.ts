import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@listing-public/render': path.resolve(__dirname, '../reposell-listing-public/src/frontend/render.ts'),
      '@reposell-selling/sync': path.resolve(__dirname, '../reposell/src/domain/selling/sync.ts'),
      '@reposell-selling/provision': path.resolve(__dirname, '../reposell/src/domain/selling/provision.ts'),
    },
  },
  test: {
    environment: 'node',
  },
});
