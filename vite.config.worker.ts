import path from "path"
import { defineConfig } from 'vite';

/**
 * Separate Vite config to bundle the JsonLayoutWorker as a standalone IIFE
 * script into dist/assets/. VSCode webview CSP forbids blob URLs and module
 * workers, so the extension host injects the URL via asWebviewUri and the
 * webview instantiates with `new Worker(url)`.
 */
export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: path.resolve(__dirname, 'webview/workers/JsonLayoutWorker.ts'),
      name: 'JsonLayoutWorker',
      formats: ['iife'],
      fileName: () => 'JsonLayoutWorker.js',
    },
    outDir: path.resolve(__dirname, 'dist'),
    minify: true,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
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
