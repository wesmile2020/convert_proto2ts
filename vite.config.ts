import { defineConfig } from 'vite';
import path from 'path';
import { resolve } from 'dns';

export default defineConfig({
  build: {
    lib: {
      entry: './src/index.ts',
      name: 'convert_proto2ts',
      fileName: 'index',
    },
    sourcemap: true,
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '~': path.resolve(__dirname, '.'),
    },
  },
});
