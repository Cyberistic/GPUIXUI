import { GpuixRenderer } from "./gpuix-web";

/**
 * Whether the renderer's GPUI window exists yet (plan 456 §10).
 *
 * `render()` returns before asynchronous graphics init runs, and the DOM canvas
 * is created at the start of that init, so neither is the signal a component
 * needs. `isInitialized()` only reports the app handle, which is assigned before
 * window creation. `getFocusedElementId()` goes through the renderer's own
 * `update_web_window`: it throws "GPUIX web window is not ready" until the window
 * handle exists, and returns null once it does. That throw **is** the signal, so
 * it is caught here — at the wasm interop boundary, not in component code.
 */
export const isWindowReady = (renderer: unknown): boolean => {
  if (!(renderer instanceof GpuixRenderer)) return false;
  try {
    renderer.getFocusedElementId();
    return true;
  } catch {
    return false;
  }
};
