import { fileURLToPath } from "node:url";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { fumadocsMdx } from "fumadocs-mdx/vite";
import { defineConfig } from "vite";

// Alchemy injects its own resource-aware Cloudflare plugin and sets
// ALCHEMY_CLOUDFLARE_VITE_INJECTED=1 (the config-file instance must stand down
// so plugin lookups and, in dev, the workerd runtime are not duplicated). See
// alchemy's Cloudflare/Workers/Sources/Vite.ts contract.
const cloudflarePlugin =
  process.env.ALCHEMY_CLOUDFLARE_VITE_INJECTED === "1"
    ? null
    : cloudflare({ viteEnvironment: { name: "ssr" } });

export default defineConfig({
  server: { port: 3000 },
  plugins: [
    cloudflarePlugin,
    fumadocsMdx(),
    tailwindcss(),
    tanstackStart(),
    react(),
  ],
  // Fumadocs ships ESM that the dep optimizer mis-bundles for SSR; keep it out
  // of pre-bundling and bundle it instead, so it shares the app's React copy
  // (fumadocs.dev FAQ; Vite 8 moved `ssr.noExternal` to `resolve.noExternal`).
  optimizeDeps: {
    exclude: ["fumadocs-ui", "fumadocs-core", "fumadocs-mdx"],
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    dedupe: ["react", "react-dom"],
    noExternal: ["fumadocs-ui", "fumadocs-core", "fumadocs-mdx"],
  },
});
