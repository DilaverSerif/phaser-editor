import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron/simple";
import fs from "node:fs";
import path from "node:path";

function copyPlayGuestPreload() {
  const src = path.join(__dirname, "electron/playGuestPreload.cjs");
  const dest = path.join(__dirname, "dist-electron/playGuestPreload.cjs");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        entry: "electron/main.ts",
        vite: {
          plugins: [
            {
              name: "copy-play-guest-preload",
              closeBundle: copyPlayGuestPreload,
            },
          ],
          build: {
            outDir: "dist-electron",
            rollupOptions: {
              output: {
                entryFileNames: "main.cjs",
                format: "cjs",
              },
            },
          },
        },
      },
      preload: {
        input: path.join(__dirname, "electron/preload.ts"),
        vite: {
          build: {
            outDir: "dist-electron",
            rollupOptions: {
              output: {
                entryFileNames: "preload.cjs",
                format: "cjs",
              },
            },
          },
        },
      },
      renderer: {},
    }),
  ],
  server: {
    port: 5173,
  },
  build: {
    outDir: "dist",
  },
});
