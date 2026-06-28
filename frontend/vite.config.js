import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev: proxy /api → backend so the frontend talks to FastAPI without CORS fuss.
// The backend serves its routes under /api, so we pass the prefix through (no rewrite).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
