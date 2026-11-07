import { build } from "esbuild";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
await build({
  entryPoints: [resolve(here, "entry.tsx")],
  bundle: true,
  platform: "browser",
  format: "esm",
  target: "esnext",
  outfile: resolve(here, "bundle.js"),
  logLevel: "warning",
  external: ["/wasm/*", "node:*"],
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [
    {
      name: "shim",
      setup(b) {
        b.onResolve({ filter: /^@gpuix\/native$/ }, () => ({
          path: resolve(here, "shim.js"),
        }));
      },
    },
  ],
});
await build({
  entryPoints: [resolve(here, "probe.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  outfile: resolve(here, "probe.mjs"),
  logLevel: "warning",
});
