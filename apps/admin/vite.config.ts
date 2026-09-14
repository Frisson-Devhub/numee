import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  envDir: path.resolve(__dirname, "../.."),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // Bind every interface. Vite defaults to loopback, so on a hosted box the panel is
    // unreachable at the machine's public address while the Next apps (which bind
    // 0.0.0.0 by default) work fine — the failure looks like "admin is down".
    host: true,
    port: 3002,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: true,
    port: 3002,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
