import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/",
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true,
    hmr: {
      clientPort: 443,
      protocol: "wss",
    },
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
    watch: {
      ignored: [
        "**/.local/**",
        "**/node_modules/.vite/**",
        "**/*.log-query.db-wal",
        "**/*.db-wal",
        "**/*.db-shm",
      ],
    },
  },
  optimizeDeps: {
    exclude: ["fsevents", "ydb-sdk"],
  },
});
