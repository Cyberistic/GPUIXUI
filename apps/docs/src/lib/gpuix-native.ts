/**
 * The browser entry the docs bundle resolves `@gpuix/native` to.
 *
 * The package publishes a `browser` condition, but its `browser.mjs` loads the
 * wasm glue with `import … with { type: "file" }`, a bundler convention Vite does
 * not reproduce inside a pre-bundled dependency: the module reached the page
 * with an absolute filesystem path and the dynamic import failed. This shim is
 * the same two exports, reading the glue through the one Vite rule
 * (`vite.config.ts` → `gpuix-web-wasm`) that already resolves `/wasm/*` to the
 * package's files. `/live` initialises the glue before it imports
 * `@gpuix/react`, so the class is ready when the reconciler constructs it.
 *
 * Only the client graph sees this file: `@gpuix/native` is external in the
 * server build, and the route imports it inside an effect.
 */
export { GpuixRenderer } from "@gpuix/native/wasm/gpuix-web.js";

/** A browser canvas is never a terminal. */
export const isTerminal = (): boolean => false;
