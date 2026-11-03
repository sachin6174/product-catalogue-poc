import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // The browser only ever talks to /api on its own origin. In dev, Vite forwards
    // it to the backend; in Docker, nginx does the same job (see nginx.conf).
    proxy: { "/api": process.env.API_URL ?? "http://localhost:3001" },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/testSetup.ts",
  },
});
