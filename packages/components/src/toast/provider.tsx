/**
 * ToastProvider: the one place where the toast store meets React.
 *
 * This is the package's only runtime boundary (EF-21): the store's layer lives in
 * a `ManagedRuntime`, the provider subscribes to the store's change stream, and
 * every command is a fire-and-forget fork on that runtime. Everything else in the
 * toast system is Effect-native or purely presentational.
 */

import { Effect } from "effect";
import * as Fiber from "effect/Fiber";
import * as ManagedRuntime from "effect/ManagedRuntime";
import * as Stream from "effect/Stream";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Toast } from "./model.js";
import {
  ToastStore,
  layer as storeLayer,
  type ToastDraft,
  type ToastStoreOptions,
} from "./store.js";
import { createRuntimeLifecycle } from "./lifecycle.js";

/** What a component inside the provider can do with toasts. */
export interface ToastApi {
  /** The queued toasts, oldest first. Re-renders on every change. */
  readonly toasts: ReadonlyArray<Toast>;
  /** Queue a toast. Invalid input is dropped by the store, not thrown. */
  readonly push: (draft: ToastDraft) => void;
  readonly dismiss: (id: string) => void;
  readonly dismissAll: () => void;
}

const ToastContext = createContext<ToastApi | undefined>(undefined);

/** The toast API. Throws outside a {@link ToastProvider}. */
export const useToast = (): ToastApi => {
  const value = useContext(ToastContext);
  if (value === undefined) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return value;
};

/** {@link ToastProvider} props. */
export interface ToastProviderProps extends ToastStoreOptions {
  readonly children?: ReactNode;
}

/**
 * Creates one runtime and one store, subscribes the tree to the queue, and
 * disposes both when it unmounts. Render it once, above everything that pushes
 * toasts, with {@link ToastViewport} as the last child of the app root.
 */
export const ToastProvider = ({
  children,
  max,
  defaultDuration,
}: ToastProviderProps) => {
  const [runtime] = useState(() =>
    ManagedRuntime.make(storeLayer({ max, defaultDuration })),
  );
  const [toasts, setToasts] = useState<ReadonlyArray<Toast>>([]);
  const [lifecycle] = useState(() =>
    createRuntimeLifecycle(() => {
      void runtime.dispose();
    }),
  );

  useEffect(() => {
    lifecycle.mount();
    return () => lifecycle.unmount();
  }, [lifecycle]);

  useEffect(() => {
    const fiber = runtime.runFork(
      Effect.flatMap(ToastStore, (store) =>
        Stream.runForEach(store.changes, (next) =>
          Effect.sync(() => setToasts(next)),
        ),
      ),
    );
    return () => {
      runtime.runFork(Fiber.interrupt(fiber));
    };
  }, [runtime]);

  const push = useCallback(
    (draft: ToastDraft) => {
      runtime.runFork(
        Effect.flatMap(ToastStore, (store) => store.push(draft)).pipe(
          Effect.tapError((error) =>
            Effect.logWarning("toast rejected", error),
          ),
          Effect.ignore,
        ),
      );
    },
    [runtime],
  );

  const dismiss = useCallback(
    (id: string) => {
      runtime.runFork(Effect.flatMap(ToastStore, (store) => store.dismiss(id)));
    },
    [runtime],
  );

  const dismissAll = useCallback(() => {
    runtime.runFork(Effect.flatMap(ToastStore, (store) => store.dismissAll));
  }, [runtime]);

  const api = useMemo<ToastApi>(
    () => ({ toasts, push, dismiss, dismissAll }),
    [dismiss, dismissAll, push, toasts],
  );

  return <ToastContext.Provider value={api}>{children}</ToastContext.Provider>;
};
