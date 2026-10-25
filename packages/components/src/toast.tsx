/** @jsxImportSource @gpuix/react */
/**
 * The toast system's public surface: one provider, one hook, one viewport.
 *
 * ```tsx
 * <ToastProvider>
 *   <App />
 *   <ToastViewport />
 * </ToastProvider>
 * ```
 *
 * `useToast()` returns the queue and the commands. The store itself is
 * Effect-native (`toast/store.ts`); the provider is the package's only
 * `ManagedRuntime` boundary, which is what keeps `runtime.run*` out of every
 * component (EF-21).
 */

export { ToastProvider, useToast } from "./toast/provider.js";
export type {
  ToastApi,
  ToastPromiseOptions,
  ToastProviderProps,
  ToastPushOptions,
} from "./toast/provider.js";
export { ToastViewport, toastMeta } from "./toast/viewport.js";
export type { ToastViewportProps } from "./toast/viewport.js";
export type { ToastStoreOptions } from "./toast/store.js";
export {
  Toast,
  ToastInput,
  ToastPhase,
  ToastTone,
  type ToastDraft,
  type ToastPromiseStep,
} from "./toast/model.js";
