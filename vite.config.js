import { defineConfig } from "vite";
import { createHtmlPlugin } from "vite-plugin-html";
import path from "path";

export default defineConfig({
  root: "src",
  base: "/",

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@styles": path.resolve(__dirname, "src/styles"),
      "@assets": path.resolve(__dirname, "src/assets"),
    },
  },

  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },

  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@styles/reset.css";`,
      },
    },
  },

  build: {
    outDir: "../dist",
    emptyOutDir: true,
    minify: "terser",
    cssMinify: true,

    rollupOptions: {
      output: {
        assetFileNames: "assets/[name]-[hash][extname]",
        chunkFileNames: "js/[name]-[hash].js",
        entryFileNames: "js/[name]-[hash].js",
      },
    },
  },

  plugins: [
    createHtmlPlugin({
      minify: true,
    }),
  ],
});
