import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { cpSync, existsSync } from "fs";

/** Vite plugin that copies static website files into dist/ after build */
function copyStaticFiles() {
  return {
    name: "copy-static-files",
    closeBundle() {
      const root = resolve(__dirname);
      const dist = resolve(__dirname, "dist");

      // Static HTML pages
      const staticFiles = [
        "index.html",
        "404.html",
        "datenschutz.html",
        "impressum.html",
        "favicon.ico",
        "favicon.png",
        "apple-touch-icon.png",
        "og-image.png",
        "robots.txt",
        "sitemap.xml",
        "sitemap-2.xml",
      ];

      for (const file of staticFiles) {
        const src = resolve(root, file);
        if (existsSync(src)) {
          cpSync(src, resolve(dist, file));
        }
      }

      // Static directories
      const staticDirs = ["blog", "styles", "js", "assets"];
      for (const dir of staticDirs) {
        const src = resolve(root, dir);
        if (existsSync(src)) {
          cpSync(src, resolve(dist, dir), { recursive: true });
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), copyStaticFiles()],
  resolve: {
    alias: {
      "@shared": resolve(__dirname, "app/shared"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        login: resolve(__dirname, "app/login/index.html"),
        docgen: resolve(__dirname, "app/docgen/index.html"),
        portal: resolve(__dirname, "app/portal/index.html"),
      },
    },
    outDir: "dist",
  },
});
