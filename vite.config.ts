import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: "./src",
  plugins: [tailwindcss()],
  build: {
    outDir: "../dist",
    minify: false,
    emptyOutDir: true,
  },
});
