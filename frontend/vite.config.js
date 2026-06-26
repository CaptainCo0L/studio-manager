import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev: proxy /api → backend so the frontend talks to FastAPI without CORS fuss.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
});
