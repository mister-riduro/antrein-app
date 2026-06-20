import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.ANTREIN_API_URL || "http://localhost:8080";
  const isProduction = mode === "production";

  const apiProxy = {
    "/api": {
      target: apiTarget,
      changeOrigin: true,
    },
  };

  return {
    build: {
      outDir: "build",
      sourcemap: !isProduction, // Disable sourcemaps in production for smaller builds
      minify: "esbuild",
      // Optimize chunks
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (
                id.includes("/vue-router/") || id.includes("/vue/") ||
                id.includes("/@vue/")
              ) {
                return "vendor";
              }
            }
          },
          entryFileNames: "assets/[name]-[hash].js",
          chunkFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash][extname]",
        },
      },
      // Performance hints
      reportCompressedSize: true,
      chunkSizeWarningLimit: 500,
    },
    plugins: [vue(), tailwindcss()],
    preview: {
      proxy: apiProxy,
      port: 4173,
    },
    server: {
      proxy: apiProxy,
      port: 5173,
      host: "0.0.0.0",
    },
    // Optimize dependencies
    optimizeDeps: {
      include: ["vue", "vue-router"],
    },
  };
});
