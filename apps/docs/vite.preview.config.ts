import { createRequire } from "node:module";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

/**
 * The isolated build for live preview surfaces (plan 455).
 *
 * It is a second Vite project, not part of the docs app: the app is SSR on
 * Workers and must never import the native renderer, while this document is a
 * client-only canvas. Two facts about the published package shape the config:
 *
 * - its browser entry imports the wasm-bindgen output with Bun's
 *   `import … with { type: "file" }`, which the ES module spec does not define,
 *   so the package root resolves to `preview/gpuix-web.ts`;
 * - the wasm artefacts are not exported subpaths, so the plugin below names the
 *   two files explicitly. Its subpath exports (`/host`, `/runtime`,
 *   `/automation`) resolve through the package as usual.
 */
const appRoot = fileURLToPath(new URL("./", import.meta.url));
const nativeRoot = dirname(
  createRequire(import.meta.url).resolve("@gpuix/native"),
);

const wasmAssets: Plugin = {
  name: "gpuix-wasm-assets",
  enforce: "pre",
  resolveId(source) {
    if (source === "@gpuix/native/wasm/gpuix-web.js") {
      return `${nativeRoot}/wasm/gpuix-web.js`;
    }
    if (source === "@gpuix/native/wasm/gpuix-web_bg.wasm?url") {
      return `${nativeRoot}/wasm/gpuix-web_bg.wasm?url`;
    }
    return null;
  },
};

export default defineConfig({
  root: fileURLToPath(new URL("./preview", import.meta.url)),
  base: "/gpuix-preview/",
  publicDir: false,
  plugins: [wasmAssets, react({ jsxImportSource: "@gpuix/react" })],
  resolve: {
    alias: [
      {
        find: /^@gpuix\/native$/,
        replacement: `${appRoot}preview/gpuix-web.ts`,
      },
    ],
    dedupe: ["react", "react-dom"],
  },
  build: {
    outDir: fileURLToPath(new URL("./public/gpuix-preview", import.meta.url)),
    emptyOutDir: true,
    target: "esnext",
    assetsInlineLimit: 0,
    sourcemap: false,
  },
});
