import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "..", "");
  const apiTarget = env.BACKEND_URL || "http://localhost:8080";
  return {
    envDir: "..",
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        "/api": { target: apiTarget, changeOrigin: true },
        "/oauth2": { target: apiTarget, changeOrigin: true },
        "/login/oauth2": { target: apiTarget, changeOrigin: true },
      },
    },
  };
});
