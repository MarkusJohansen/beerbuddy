/// <reference types="vitest/config" />

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig(({ command }) => {
  // Vite bakes this into the bundle at build time. It used to have no check, so
  // an unset value produced a bundle where every call was fetch(undefined) and
  // the interface failed with unexplained network errors.
  if (command === "build" && !process.env.VITE_APP_BACKEND_URL) {
    throw new Error(
      "VITE_APP_BACKEND_URL is not set. Copy frontend/.env.example to frontend/.env, or pass it as a build arg."
    );
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      // Mirrors the "@/*" path in tsconfig.json, which only type-checks.
      alias: { "@": path.resolve(import.meta.dirname, "src") },
    },
    server: {
      port: 5173,
      host: true,
      watch: {
        // podman bind-mounts on macOS do not deliver inotify events, so the
        // default watcher never fires and hot reload silently stops working.
        usePolling: true,
        interval: 300,
      },
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["src/vitest-setup.ts"],
    },
  };
});
