/**
 * Warm the live renderer when a reader shows intent to open it.
 *
 * The live page downloads the ~20 MiB wasm browser build. Starting that fetch
 * on hover, focus or press of the "open live" link lets the transfer overlap
 * the reader's decision, so the live page's own fetch is served from the
 * browser's cache. It is intent-only: opening the Native tab does not download
 * the module, and the href works whether or not this ran.
 */
let started = false;

export const prefetchLiveSurface = (): void => {
  if (started || typeof window === "undefined") return;
  started = true;
  void import("./live-wasm")
    .then((module) => fetch(module.liveWasmUrl))
    .catch(() => undefined);
};
