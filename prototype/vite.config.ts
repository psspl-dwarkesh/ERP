import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    // Split the heavy library code out of the entry document so the intro page
    // does not carry the chart and grid implementations it never renders.
    rollupOptions: {
      output: {
        manualChunks: {
          charts: ["recharts"],
          grid: ["@tanstack/react-table"],
          overlay: [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-tabs",
            "cmdk",
          ],
          icons: ["lucide-react"],
        },
      },
    },
  },
});
