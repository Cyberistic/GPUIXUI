/**
 * The browser entry for GPUix's published WebAssembly renderer.
 *
 * `@gpuix/native`'s own browser entry imports the wasm-bindgen output with
 * `with { type: "file" }`, which is Bun's convention and not part of the ES
 * module spec. The two artefacts are the same; `vite.preview.config.ts` names
 * them and Vite's `?url` supplies the asset path.
 *
 * Initialisation is an explicit call, not a module side effect: this package is
 * `sideEffects: false`, so a top-level `await init(...)` is legal to elide. The
 * entry awaits `initGpuixWeb()` before it renders, which keeps the dependency
 * visible where it matters.
 */
import init, { GpuixRenderer } from "@gpuix/native/wasm/gpuix-web.js";
import wasmUrl from "@gpuix/native/wasm/gpuix-web_bg.wasm?url";

/** Load and instantiate the renderer. Safe to call more than once. */
export const initGpuixWeb = (): Promise<unknown> =>
  init({ module_or_path: wasmUrl });

export { GpuixRenderer };
