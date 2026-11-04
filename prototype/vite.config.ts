import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Two builds of the same front end:
 *  - default (`npm run dev` / `npm run build`, and `--mode api`): talks to the Threadline API
 *    with sign-in, so every read and write goes to the server (the real database). This is the
 *    demo default.
 *  - `--mode mock` (`npm run dev:mock` / `npm run build:mock`): the whole ERP runs in the
 *    browser on demo data, no backend — the old static-demo build.
 */
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  define: { "import.meta.env.VITE_API_MODE": JSON.stringify(mode === "mock" ? "mock" : "remote") },
  server: {
    // In API mode the dev server forwards /api to the backend, so cookies stay same-origin.
    proxy: { "/api": { target: process.env.API_TARGET ?? "http://127.0.0.1:4000", changeOrigin: false } },
  },
  build: {
    outDir: "dist",
    // Split the heavy library code out of the entry document so the showcase
    // does not carry the chart and grid implementations it never renders.
    rollupOptions: {
      output: {
        manualChunks: {
          charts: ["recharts"],
          grid: ["@tanstack/react-table"],
          overlay: ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-tabs", "@radix-ui/react-select", "@radix-ui/react-popover", "@radix-ui/react-tooltip", "cmdk"],
          icons: ["lucide-react"],
        },
      },
    },
  },
}));
