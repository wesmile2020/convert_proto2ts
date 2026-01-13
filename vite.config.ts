import { defineConfig } from 'vite';
import path from 'path';

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
