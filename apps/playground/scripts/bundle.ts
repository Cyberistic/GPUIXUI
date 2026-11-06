import { Effect } from "effect";
import * as esbuild from "esbuild";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const app = resolve(import.meta.dirname, "..");
const outdir = resolve(app, "dist/bundle");
const start = `import module from "node:module";
module.enableCompileCache();
setTimeout(() => module.flushCompileCache(), 1000).unref();
await import("./main.mjs");
`;

const nativeAddonStaysExternal: esbuild.Plugin = {
  name: "native-addon-stays-external",
  setup(build) {
    build.onResolve({ filter: /^@gpuix\/native$/ }, ({ path }) => ({
      path,
      external: true,
    }));
  },
};

// GPUIX_CHECKOUT measures an unreleased @gpuix build against this app.
const unreleasedGpuix = (checkout: string): esbuild.Plugin => ({
  name: "unreleased-gpuix",
  setup(build) {
    const resolveDir = resolve(checkout, "packages/react");
    build.onResolve(
      { filter: /^(react(\/.*)?|@gpuix\/(react|native\/.+)(\/.*)?)$/ },
      (args) =>
        args.pluginData
          ? undefined
          : build.resolve(args.path, {
              resolveDir,
              kind: args.kind,
              pluginData: true,
            }),
    );
    build.onResolve({ filter: /^@gpuix\/react$/ }, () => ({
      path: resolve(resolveDir, "dist/index.js"),
    }));
  },
});

const program = Effect.tryPromise({
  try: async () => {
    const checkout = process.env.GPUIX_CHECKOUT;
    await esbuild.build({
      entryPoints: [
        resolve(app, "dist/main.js"),
        resolve(app, "dist/launch/hello.js"),
      ],
      outdir,
      outbase: resolve(app, "dist"),
      outExtension: { ".js": ".mjs" },
      bundle: true,
      splitting: true,
      format: "esm",
      platform: "node",
      minify: true,
      define: { "process.env.NODE_ENV": '"production"' },
      banner: {
        js: 'import { createRequire as __createRequire } from "node:module"; const require = __createRequire(import.meta.url);',
      },
      loader: {
        ".png": "file",
        ".webp": "file",
        ".ttf": "file",
        ".woff2": "file",
        ".svg": "file",
      },
      plugins: checkout
        ? [nativeAddonStaysExternal, unreleasedGpuix(checkout)]
        : [nativeAddonStaysExternal],
    });
    await writeFile(resolve(outdir, "start.mjs"), start);
  },
  catch: (cause) => new Error(`playground bundle failed: ${String(cause)}`),
});

await Effect.runPromise(program);
