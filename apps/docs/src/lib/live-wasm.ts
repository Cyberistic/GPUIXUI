/**
 * The browser build's wasm URL.
 *
 * Kept in its own module so the intent prefetch can import it lazily — the
 * docs' server graph never evaluates it — and so a test can stand in a URL
 * without resolving the package's wasm asset.
 */
import wasmUrl from "@gpuix/native/wasm/gpuix-web_bg.wasm?url";

export const liveWasmUrl = wasmUrl;
