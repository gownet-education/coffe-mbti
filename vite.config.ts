import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Relative base: the site works under any GitHub Pages repository path.
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: { home: "index.html", mauritia: "mauritia/index.html", sidetempo: "sidetempo/index.html" },
    },
  },
});
