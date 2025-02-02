import path from "path"
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    minify: true,
    rollupOptions: {
      output: {
        entryFileNames: 'main.js',
        assetFileNames: 'main.css',
      },
    },
  },
  resolve: {
    alias: {
      "@src": path.resolve(__dirname, "./src"),
      "@webview": path.resolve(__dirname, "./webview"),
    },
  },
});
