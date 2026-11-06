/** @jsxImportSource @gpuix/react */
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

export interface ToastPushOptions {
  readonly onAction?: () => void;
}

export interface ToastPromiseOptions<Value> {
  readonly loading: ToastDraft;

  readonly success: ToastPromiseStep<Value>;

  readonly error: ToastPromiseStep<unknown>;
}

export interface ToastApi {
  readonly toasts: ReadonlyArray<Toast>;

  readonly push: (draft: ToastDraft, options?: ToastPushOptions) => void;

  readonly promise: <Value>(
    source: Promise<Value>,
    options: ToastPromiseOptions<Value>,
  ) => Promise<Value>;
  readonly dismiss: (id: string) => void;
  readonly dismissAll: () => void;

  readonly pause: (id: string) => void;

  readonly resume: (id: string) => void;

  readonly hold: (held: boolean) => void;

  readonly actionFor: (id: string) => Option.Option<() => void>;
}

const ToastContext = createContext<ToastApi | undefined>(undefined);

export const useToast = (): ToastApi => {
  const value = useContext(ToastContext);
  if (value === undefined) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return value;
};

export interface ToastProviderProps extends ToastStoreOptions {
  readonly children?: ReactNode;
}

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
