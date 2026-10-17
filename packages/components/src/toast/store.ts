/**
 * The toast store: one Effect service that owns the queue, the auto-dismiss
 * timers, and the cancellation of both.
 *
 * A `SubscriptionRef` is the single source of truth, so React subscribes to one
 * stream instead of polling; a `FiberMap` owns the timers, so dismissing a toast
 * cancels its timer at once and every timer dies with the scope. Ids are a
 * monotonic counter rather than a random value, so a timer can never dismiss a
 * toast other than the one it was scheduled for, and tests stay deterministic.
 */

import { Effect, pipe } from "effect";
import * as Arr from "effect/Array";
import * as Context from "effect/Context";
import * as Duration from "effect/Duration";
import * as FiberMap from "effect/FiberMap";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import type * as Scope from "effect/Scope";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import * as SubscriptionRef from "effect/SubscriptionRef";
import { Toast, ToastInput } from "./model.js";

/** The queue and its id counter, in one value so every update is atomic. */
interface State {
  readonly seq: number;
  readonly toasts: ReadonlyArray<Toast>;
}

/** A toast a caller may push, as plain data. */
export type ToastDraft = typeof ToastInput.Encoded;

/** What the store can do. */
export interface ToastStoreService {
  /** The queued toasts, oldest first. */
  readonly toasts: Effect.Effect<ReadonlyArray<Toast>>;
  /** The queue, re-emitted on every change (current value first). */
  readonly changes: Stream.Stream<ReadonlyArray<Toast>>;
  /** Decode a draft, append it, and schedule its auto-dismiss. */
  readonly push: (
    draft: ToastDraft,
  ) => Effect.Effect<Toast, Schema.SchemaError>;
  /** Drop one toast and cancel its timer. */
  readonly dismiss: (id: string) => Effect.Effect<void>;
  /** Drop every toast and cancel every timer. */
  readonly dismissAll: Effect.Effect<void>;
}

/** The store tag. One runtime, and so one store, exists per provider. */
export class ToastStore extends Context.Service<
  ToastStore,
  ToastStoreService
>()("gpuixui/components/ToastStore") {}

/** How many toasts are kept, and how long a draft without a `duration` lives. */
export interface ToastStoreOptions {
  /** Toasts kept before the oldest is dropped. Default 3. */
  readonly max?: number;
  /** Auto-dismiss delay for a draft with no `duration`. Default 5 seconds. */
  readonly defaultDuration?: Duration.Input;
}

const DEFAULT_MAX = 3;
const DEFAULT_DURATION = Duration.seconds(5);

const decodeDraft = Schema.decodeUnknownEffect(ToastInput);

/** A duration auto-dismisses a toast only when it is positive and finite. */
const dismisses = (duration: Duration.Duration): boolean =>
  Duration.isFinite(duration) && Duration.toMillis(duration) > 0;

/**
 * Build the store. Scoped: the timers are owned by the `FiberMap`, so the
 * runtime that provides the layer also ends them.
 */
export const makeToastStore = Effect.fn("ToastStore.make")(function* (
  options?: ToastStoreOptions,
): Effect.fn.Return<ToastStoreService, never, Scope.Scope> {
  const max = Math.max(1, Math.trunc(options?.max ?? DEFAULT_MAX));
  const fallback = pipe(
    Duration.fromInput(options?.defaultDuration ?? DEFAULT_DURATION),
    Option.getOrElse(() => DEFAULT_DURATION),
  );

  const state = yield* SubscriptionRef.make<State>({ seq: 0, toasts: [] });
  const timers = yield* FiberMap.make<string>();

  /** Drop `id` from the queue. Touches no timer, so a timer may call it. */
  const drop = Effect.fnUntraced(function* (id: string) {
    yield* SubscriptionRef.update(state, (current) => ({
      ...current,
      toasts: Arr.filter(current.toasts, (toast) => toast.id !== id),
    }));
  });

  const dismiss = Effect.fn("ToastStore.dismiss")(function* (id: string) {
    yield* drop(id);
    yield* FiberMap.remove(timers, id);
  });

  const dismissAll = Effect.fn("ToastStore.dismissAll")(function* () {
    yield* SubscriptionRef.update(state, (current) => ({
      ...current,
      toasts: [],
    }));
    yield* FiberMap.clear(timers);
  })();

  const push = Effect.fn("ToastStore.push")(function* (draft: ToastDraft) {
    const input = yield* decodeDraft(draft);
    const { toast, expired } = yield* SubscriptionRef.modify(
      state,
      (current) => {
        const toast = new Toast({
          id: String(current.seq + 1),
          title: input.title,
          description: input.description,
          tone: input.tone,
        });
        const appended = Arr.append(current.toasts, toast);
        const overflow = Math.max(0, Arr.length(appended) - max);
        return [
          {
            toast,
            expired: Arr.map(Arr.take(appended, overflow), (t) => t.id),
          },
          { seq: current.seq + 1, toasts: Arr.drop(appended, overflow) },
        ] as const;
      },
    );

    // At most `max - 1` timers are cancelled, and each is an interruption of a
    // sibling fiber: one at a time, in queue order.
    yield* Effect.forEach(expired, (id) => FiberMap.remove(timers, id), {
      concurrency: 1,
      discard: true,
    });

    const duration = Option.getOrElse(input.duration, () => fallback);
    if (dismisses(duration)) {
      yield* FiberMap.run(
        timers,
        toast.id,
        Effect.sleep(duration).pipe(Effect.andThen(drop(toast.id))),
      );
    }

    return toast;
  });

  return {
    toasts: pipe(
      SubscriptionRef.get(state),
      Effect.map((current) => current.toasts),
    ),
    changes: pipe(
      SubscriptionRef.changes(state),
      Stream.map((current) => current.toasts),
    ),
    push,
    dismiss,
    dismissAll,
  };
});

/** A layer holding one store, scoped to the runtime that provides it. */
export const layer = (options?: ToastStoreOptions): Layer.Layer<ToastStore> =>
  Layer.effect(ToastStore, makeToastStore(options));
