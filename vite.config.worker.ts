import path from "path";
import { defineConfig } from "vite";

/**
 * Standalone worker bundle for VSCode Webview.
 *
 * VSCode CSP forbids:
 * - module workers
 * - blob URLs
 *
 * Therefore the worker must be emitted as a classic IIFE file
 * and instantiated via:
 *
 * new Worker(webview.asWebviewUri(...))
 */
export default defineConfig({
  build: {
    emptyOutDir: false,

    outDir: path.resolve(__dirname, "dist"),

    minify: true,

    lib: {
      entry: path.resolve(
        __dirname,
        "webview/workers/JsonLayoutWorker.ts"
      ),

      name: "JsonLayoutWorker",

      formats: ["iife"],

      fileName: () => "JsonLayoutWorker.js",
    },
  },

  resolve: {
    alias: {
      "@src": path.resolve(__dirname, "./src"),

      "@webview": path.resolve(
        __dirname,
        "./webview"
      ),
    },
  },
});
