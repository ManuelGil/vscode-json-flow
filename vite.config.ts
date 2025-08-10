import path from "path"
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    minify: true,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        entryFileNames: 'main.js',
        // Ensure only CSS is named deterministically; other assets keep their own names
        assetFileNames: (assetInfo) => {
          const ext = path.extname(assetInfo.name || '');
          if (ext === '.css') {
            return 'main.css';
          }
          return 'assets/[name][extname]';
        },
      },
    },
  },
  resolve: {
    alias: {
      '@src': path.resolve(__dirname, './src'),
      '@webview': path.resolve(__dirname, './webview'),
    },
  },
});
