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
 * `useToast()` returns the queue and three fire-and-forget commands. The store
 * itself is Effect-native (`toast/store.ts`); the provider is the package's only
 * `ManagedRuntime` boundary, which is what keeps `runtime.run*` out of every
 * component (EF-21).
 */

export { ToastProvider, useToast } from "./toast/provider.js";
export type { ToastApi, ToastProviderProps } from "./toast/provider.js";
export { ToastViewport, toastMeta } from "./toast/viewport.js";
export type { ToastViewportProps } from "./toast/viewport.js";
export type { ToastDraft, ToastStoreOptions } from "./toast/store.js";
export { Toast, ToastInput, ToastTone } from "./toast/model.js";
