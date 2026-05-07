import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";

const repoBase = process.env.GITHUB_PAGES === "true" ? "/rl-replay-web/" : "/";

export default defineConfig({
  base: repoBase,
  plugins: [react(), wasm()],
  worker: {
    format: "es"
  },
  test: {
    environment: "jsdom",
    globals: true
  }
});
