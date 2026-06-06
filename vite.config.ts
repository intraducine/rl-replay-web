import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";

const repoBase = process.env.GITHUB_PAGES === "true" ? "/rl-replay-web/" : "/";

export default defineConfig({
  base: repoBase,
  plugins: [react(), wasm()],
  build: {
    chunkSizeWarningLimit: 750,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("@react-three")) return "react-three";
          if (id.includes("three/examples")) return "three-examples";
          if (id.includes("three/")) return "three-core";
          return undefined;
        }
      }
    }
  },
  worker: {
    format: "es"
  },
  test: {
    environment: "jsdom",
    globals: true
  }
});
