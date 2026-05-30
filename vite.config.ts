import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 3001,
    proxy: {
      "/api/gql": {
        target: process.env.INNGEST_URL ?? "http://localhost:8288",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/gql/, "/v0/gql"),
      },
      "/fn/remove": {
        target: process.env.INNGEST_URL ?? "http://localhost:8288",
        changeOrigin: true,
      },
      "/api/worker-sync": {
        target: process.env.INNGEST_WORKER_URL ?? "http://localhost:3000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/worker-sync/, "/api/inngest"),
      },
    },
  },
});
