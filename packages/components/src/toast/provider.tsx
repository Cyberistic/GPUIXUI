/**
 * ToastProvider: the one place where the toast store meets React.
 *
 * This is the package's only runtime boundary (EF-21): the store's layer lives in
 * a `ManagedRuntime`, the provider subscribes to the store's change stream, and
 * every command is a fire-and-forget fork on that runtime. Everything else in the
 * toast system is Effect-native or purely presentational.
 */

import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Fiber from "effect/Fiber";
import * as HashMap from "effect/HashMap";
import * as HashSet from "effect/HashSet";
import * as ManagedRuntime from "effect/ManagedRuntime";
import * as Option from "effect/Option";
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
import type { ToastTiming } from "./timing.js";

/** The UI half of a toast action; the label travels in `ToastDraft.action`. */
export interface ToastPushOptions {
  /** Runs when the action control is pressed; the toast then dismisses. */
  readonly onAction?: () => void;
}

/** What a component inside the provider can do with toasts. */
export interface ToastApi {
  /** The queued toasts, oldest first. Re-renders on every change. */
  readonly toasts: ReadonlyArray<Toast>;
  /** Queue a toast. Invalid input is dropped by the store, not thrown. */
  readonly push: (draft: ToastDraft, options?: ToastPushOptions) => void;
  readonly dismiss: (id: string) => void;
  readonly dismissAll: () => void;
  /** Stop the auto-dismiss clock, e.g. while the pointer rests on the card. */
  readonly pause: (id: string) => void;
  /** Restart it with the remaining time. */
  readonly resume: (id: string) => void;
  /** The handler for a queued action. Absence means the caller supplied none. */
  readonly actionFor: (id: string) => Option.Option<() => void>;
  /** The live auto-dismiss timing, absent for a card that never expires. */
  readonly timingFor: (id: string) => Option.Option<ToastTiming>;
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
  const [actions, setActions] = useState<HashMap.HashMap<string, () => void>>(
    HashMap.empty,
  );
  const [timings, setTimings] = useState<HashMap.HashMap<string, ToastTiming>>(
    HashMap.empty,
  );
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
          Effect.sync(() => {
            setToasts(next);
            // The queue is the only proof a toast left: an auto-dismissal never
            // calls dismiss. Pruning where the new queue arrives cannot outrun a
            // push's registration the way a render-scoped effect could — a
            // toast pushed from a mount effect arrived before this provider's
            // own effects and lost its action handler (plan 838).
            const live = HashSet.fromIterable(
              Arr.map(next, (toast) => toast.id),
            );
            setActions((current) => {
              const pruned = HashMap.filter(current, (_, id) =>
                HashSet.has(live, id),
              );
              return HashMap.size(pruned) === HashMap.size(current)
                ? current
                : pruned;
            });
          }),
        ),
      ),
    );
    return () => {
      runtime.runFork(Fiber.interrupt(fiber));
    };
  }, [runtime]);

  useEffect(() => {
    const fiber = runtime.runFork(
      Effect.flatMap(ToastStore, (store) =>
        Stream.runForEach(store.timingChanges, (next) =>
          Effect.sync(() =>
            setTimings(
              HashMap.fromIterable(
                Arr.map(next, (timing) => [timing.id, timing] as const),
              ),
            ),
          ),
        ),
      ),
    );
    return () => {
      runtime.runFork(Fiber.interrupt(fiber));
    };
  }, [runtime]);

  const push = useCallback(
    (draft: ToastDraft, options?: ToastPushOptions) => {
      const onAction = options?.onAction;
      runtime.runFork(
        Effect.flatMap(ToastStore, (store) => store.push(draft)).pipe(
          Effect.tap((toast) =>
            Effect.sync(() => {
              if (onAction === undefined) return;
              setActions((current) => HashMap.set(current, toast.id, onAction));
            }),
          ),
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

  const pause = useCallback(
    (id: string) => {
      runtime.runFork(Effect.flatMap(ToastStore, (store) => store.pause(id)));
    },
    [runtime],
  );

  const resume = useCallback(
    (id: string) => {
      runtime.runFork(Effect.flatMap(ToastStore, (store) => store.resume(id)));
    },
    [runtime],
  );

  const actionFor = useCallback(
    (id: string): Option.Option<() => void> => HashMap.get(actions, id),
    [actions],
  );

  const timingFor = useCallback(
    (id: string): Option.Option<ToastTiming> => HashMap.get(timings, id),
    [timings],
  );

  const api = useMemo<ToastApi>(
    () => ({
      toasts,
      push,
      dismiss,
      dismissAll,
      pause,
      resume,
      actionFor,
      timingFor,
    }),
    [actionFor, dismiss, dismissAll, pause, push, resume, timings, toasts],
  );

  return <ToastContext.Provider value={api}>{children}</ToastContext.Provider>;
};
