import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fumadocsMdx } from "fumadocs-mdx/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { publicSymbolsPlugin } from "./plugins/public-symbols-plugin";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    fumadocsMdx(),
    tailwindcss(),
    tanstackStart(),
    react(),
    publicSymbolsPlugin(),
  ],
  // `@/` mirrors the tsconfig path; Start's dependency scanner does not read it.
  resolve: {
    alias: [{ find: /^@\//, replacement: `${path.resolve(root, "src")}/` }],
  },
  server: {
    port: 4175,
  },
});
