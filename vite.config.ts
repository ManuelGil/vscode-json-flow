import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  build: {
    minify: true,

    /**
     * VSCode webviews behave more predictably
     * with a single CSS bundle.
     */
    cssCodeSplit: false,

    /**
     * Suppress large bundle warning.
     * VSCode extensions commonly bundle large UI libs.
     */
    chunkSizeWarningLimit: 1000,

    rollupOptions: {
      output: {
        /**
         * Stable entry filename expected by the extension host.
         */
        entryFileNames: "main.js",

        /**
         * Keep deterministic CSS name while avoiding
         * asset collisions under Rollup 4 / Vite 8.
         */
        assetFileNames: (assetInfo) => {
          const ext = path.extname(assetInfo.name || "");

          if (ext === ".css") {
            return "main.css";
          }

          return "assets/[name]-[hash][extname]";
        },
      },
    },
  },

  /**
   * Main app workers can stay ES modules.
   *
   * The standalone JsonLayoutWorker is handled
   * separately in vite.config.worker.ts as IIFE
   * due to VSCode CSP restrictions.
   */
  worker: {
    format: "es",
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
