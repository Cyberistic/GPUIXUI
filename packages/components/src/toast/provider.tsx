/** @jsxImportSource @gpuix/react */
/**
 * ToastProvider: the one place where the toast store meets React.
 *
 * This is the package's only runtime boundary (EF-21): the store's layer lives in
 * a `ManagedRuntime`, the provider subscribes to the store's change stream, and
 * every command is a fire-and-forget fork on that runtime. Everything else in the
 * toast system is Effect-native or purely presentational.
 *
 * `promise` is Base UI's `Toast.promise` in this shape: one loading row is
 * queued, the answer updates that row in place, and the caller's promise is
 * returned untouched so its value and rejection still reach the caller. The
 * update is a fork on the same runtime, so it cannot race a dismissal the
 * reader made first — a toast that already left answers `None`.
 */

import { Effect, Exit } from "effect";
import * as Arr from "effect/Array";
import * as Cause from "effect/Cause";
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
import {
  toastStep,
  type Toast,
  type ToastDraft,
  type ToastPromiseStep,
} from "./model.js";
import {
  ToastStore,
  layer as storeLayer,
  type ToastStoreOptions,
} from "./store.js";
import { createRuntimeLifecycle } from "./lifecycle.js";

/** The UI half of a toast action; the label travels in `ToastDraft.action`. */
export interface ToastPushOptions {
  /** Runs when the action control is pressed; the toast then dismisses. */
  readonly onAction?: () => void;
}

/** The three states of a promise toast. */
export interface ToastPromiseOptions<Value> {
  /** Queued at once and held until the promise settles. */
  readonly loading: ToastDraft;
  /** The row's content when the promise resolves. */
  readonly success: ToastPromiseStep<Value>;
  /** The row's content when the promise rejects. */
  readonly error: ToastPromiseStep<unknown>;
}

/** What a component inside the provider can do with toasts. */
export interface ToastApi {
  /** The queued toasts, oldest first. Re-renders on every change. */
  readonly toasts: ReadonlyArray<Toast>;
  /** Queue a toast. Invalid input is dropped by the store, not thrown. */
  readonly push: (draft: ToastDraft, options?: ToastPushOptions) => void;
  /**
   * Queue a loading toast and settle the same row with the promise's answer.
   * Returns the caller's promise: its value and rejection are unchanged.
   */
  readonly promise: <Value>(
    source: Promise<Value>,
    options: ToastPromiseOptions<Value>,
  ) => Promise<Value>;
  readonly dismiss: (id: string) => void;
  readonly dismissAll: () => void;
  /** Stop the auto-dismiss clock, e.g. while the pointer rests on the card. */
  readonly pause: (id: string) => void;
  /** Restart it with the remaining time. */
  readonly resume: (id: string) => void;
  /** Hold or release every clock: the stack's pointer and focus rule. */
  readonly hold: (held: boolean) => void;
  /** The handler for a queued action. Absence means the caller supplied none. */
  readonly actionFor: (id: string) => Option.Option<() => void>;
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

  // An auto-dismissed action toast leaves the queue without a dismiss() call, so
  // the handler map is pruned from the queue itself. Returning the same map when
  // nothing was removed keeps React from re-rendering.
  useEffect(() => {
    const live = HashSet.fromIterable(Arr.map(toasts, (toast) => toast.id));
    setActions((current) => {
      const next = HashMap.filter(current, (_, id) => HashSet.has(live, id));
      return HashMap.size(next) === HashMap.size(current) ? current : next;
    });
  }, [toasts]);

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

  const promise = useCallback(
    <Value,>(
      source: Promise<Value>,
      options: ToastPromiseOptions<Value>,
    ): Promise<Value> => {
      runtime.runFork(
        Effect.gen(function* () {
          const store = yield* ToastStore;
          const toast = yield* store.push({
            ...options.loading,
            phase: "loading",
          });
          const result = yield* Effect.exit(
            Effect.tryPromise({
              try: () => source,
              catch: (cause) => cause,
            }),
          );
          const draft = Exit.isSuccess(result)
            ? toastStep(options.success, result.value)
            : toastStep(options.error, Cause.squash(result.cause));
          // A step the model rejects (an empty title from a mapper) must not
          // leave the loading row on screen forever: the row closes and the
          // rejection is reported, rather than a card that never settles.
          const settled = yield* Effect.exit(store.update(toast.id, draft));
          if (Exit.isFailure(settled)) {
            yield* Effect.logWarning(
              "toast promise answer rejected",
              Cause.squash(settled.cause),
            );
            yield* store.dismiss(toast.id);
          }
        }).pipe(
          Effect.tapError((error) =>
            Effect.logWarning("toast promise rejected", error),
          ),
          Effect.ignore,
        ),
      );
      return source;
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

  const hold = useCallback(
    (held: boolean) => {
      runtime.runFork(Effect.flatMap(ToastStore, (store) => store.hold(held)));
    },
    [runtime],
  );

  const actionFor = useCallback(
    (id: string): Option.Option<() => void> => HashMap.get(actions, id),
    [actions],
  );

  const api = useMemo<ToastApi>(
    () => ({
      toasts,
      push,
      promise,
      dismiss,
      dismissAll,
      pause,
      resume,
      hold,
      actionFor,
    }),
    [
      actionFor,
      dismiss,
      dismissAll,
      hold,
      pause,
      promise,
      push,
      resume,
      toasts,
    ],
  );

  return <ToastContext.Provider value={api}>{children}</ToastContext.Provider>;
};
