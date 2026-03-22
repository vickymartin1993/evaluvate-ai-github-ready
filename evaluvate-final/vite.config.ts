import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "localhost",
    port: 8080,
    hmr: { overlay: false },

    // Proxy /api/* to the Azure Functions local emulator.
    // This means the frontend calls http://localhost:8080/api/...
    // and Vite forwards them to http://localhost:7071/api/...
    // so there are no CORS issues in local development.
    proxy: {
      "/api": {
        target: "http://localhost:7071",
        changeOrigin: true,
        // Uncomment if you need to inspect proxy traffic:
        // configure: (proxy) => proxy.on("error", (err) => console.error(err)),
      },
    },
  },

  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  build: {
    // Warn when any chunk exceeds 500 KB — helps catch accidental large imports
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // Split vendor libraries into a separate chunk for better browser caching
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          query: ["@tanstack/react-query"],
          ui: ["lucide-react"],
        },
      },
    },
  },
});
