import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import reactBabel from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "localhost",
    port: 8000,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 8000,
      overlay: false
    }
  },
  plugins: [
    // Temporarily use SWC for both dev and prod to avoid Babel issues
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  assetsInclude: ['**/*.glb', '**/*.gltf'],
}));
