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

import { Effect, Match, pipe } from "effect";
import * as Arr from "effect/Array";
import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as Duration from "effect/Duration";
import * as FiberMap from "effect/FiberMap";
import * as HashMap from "effect/HashMap";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import type * as Scope from "effect/Scope";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import * as SubscriptionRef from "effect/SubscriptionRef";
import { Toast, ToastInput } from "./model.js";
import { clampRemaining, type ToastTiming } from "./timing.js";

/** The queue and its id counter, in one value so every update is atomic. */
interface State {
  readonly seq: number;
  readonly toasts: ReadonlyArray<Toast>;
}

/** A live auto-dismiss timer: counting down, or held with a remainder. */
type Timer =
  | {
      readonly _tag: "running";
      readonly totalMs: number;
      readonly deadline: number;
    }
  | {
      readonly _tag: "paused";
      readonly totalMs: number;
      readonly remainingMs: number;
    };

/** Project one clock row to the public timing shape at `now`. */
const timingOf = (id: string, timer: Timer, now: number): ToastTiming =>
  Match.value(timer).pipe(
    Match.tagsExhaustive({
      running: (running) => ({
        id,
        totalMs: running.totalMs,
        remainingMs: clampRemaining(running.totalMs, running.deadline - now),
        paused: false,
      }),
      paused: (held) => ({
        id,
        totalMs: held.totalMs,
        remainingMs: clampRemaining(held.totalMs, held.remainingMs),
        paused: true,
      }),
    }),
  );

/** A toast a caller may push, as plain data. */
export type ToastDraft = typeof ToastInput.Encoded;

/** What the store can do. */
export interface ToastStoreService {
  /** The queued toasts, oldest first. */
  readonly toasts: Effect.Effect<ReadonlyArray<Toast>>;
  /** The queue, re-emitted on every change (current value first). */
  readonly changes: Stream.Stream<ReadonlyArray<Toast>>;
  /** The current timer state of every auto-dismissing toast. */
  readonly timings: Effect.Effect<ReadonlyArray<ToastTiming>>;
  /** `timings`, re-emitted whenever a timer starts, pauses, resumes or ends. */
  readonly timingChanges: Stream.Stream<ReadonlyArray<ToastTiming>>;
  /** Decode a draft, append it, and schedule its auto-dismiss. */
  readonly push: (
    draft: ToastDraft,
  ) => Effect.Effect<Toast, Schema.SchemaError>;
  /** Drop one toast and cancel its timer. */
  readonly dismiss: (id: string) => Effect.Effect<void>;
  /** Drop every toast and cancel every timer. */
  readonly dismissAll: Effect.Effect<void>;
  /** Stop the auto-dismiss clock for `id`; a no-op when it has no timer. */
  readonly pause: (id: string) => Effect.Effect<void>;
  /** Restart it with the remaining time, dismissing at once when none is left. */
  readonly resume: (id: string) => Effect.Effect<void>;
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
  /** The observable timer state; the FiberMap only owns the live sleeps. */
  const clocks = yield* SubscriptionRef.make(HashMap.empty<string, Timer>());

  /** Drop `id` from the queue. Touches no timer, so a timer may call it. */
  const drop = Effect.fnUntraced(function* (id: string) {
    yield* SubscriptionRef.update(state, (current) => ({
      ...current,
      toasts: Arr.filter(current.toasts, (toast) => toast.id !== id),
    }));
  });

  /** Cancel `id`'s timer and forget its published clock. */
  const forget = Effect.fnUntraced(function* (id: string) {
    yield* FiberMap.remove(timers, id);
    yield* SubscriptionRef.update(clocks, HashMap.remove(id));
  });

  /** Remove only the running row a finished timer owns, never a newer hold. */
  const forgetRunning = (id: string, deadline: number) =>
    SubscriptionRef.update(clocks, (current) =>
      pipe(
        HashMap.get(current, id),
        Option.match({
          onNone: () => current,
          onSome: (timer) =>
            Match.value(timer).pipe(
              Match.tagsExhaustive({
                running: (running) =>
                  running.deadline === deadline
                    ? HashMap.remove(current, id)
                    : current,
                paused: () => current,
              }),
            ),
        }),
      ),
    );

  /** Sleep `millis`, then drop; publish the deadline under its full total. */
  const schedule = Effect.fnUntraced(function* (
    id: string,
    millis: number,
    totalMs: number = millis,
  ) {
    const now = yield* Clock.currentTimeMillis;
    const deadline = now + millis;
    yield* SubscriptionRef.update(clocks, (current) =>
      HashMap.set(current, id, { _tag: "running", totalMs, deadline } as const),
    );
    yield* FiberMap.run(
      timers,
      id,
      Effect.sleep(Duration.millis(millis)).pipe(
        // `drop` first, so the queue is already correct if the timer is
        // interrupted between the sleep and this cleanup.
        Effect.andThen(drop(id)),
        Effect.ensuring(forgetRunning(id, deadline)),
      ),
    );
  });

  /** Read the clock rows at one instant, with ids in queue order. */
  const readTimings = Effect.fnUntraced(function* (
    current: HashMap.HashMap<string, Timer>,
  ) {
    const now = yield* Clock.currentTimeMillis;
    return Arr.sort(
      Arr.map(HashMap.toEntries(current), ([id, timer]) =>
        timingOf(id, timer, now),
      ),
      Order.mapInput(Order.Number, (timing: ToastTiming) => Number(timing.id)),
    );
  });

  const dismiss = Effect.fn("ToastStore.dismiss")(function* (id: string) {
    yield* drop(id);
    yield* forget(id);
  });

  const dismissAll = Effect.fn("ToastStore.dismissAll")(function* () {
    yield* SubscriptionRef.update(state, (current) => ({
      ...current,
      toasts: [],
    }));
    yield* FiberMap.clear(timers);
    yield* SubscriptionRef.set(clocks, HashMap.empty());
  })();

  const pause = Effect.fn("ToastStore.pause")(function* (id: string) {
    const now = yield* Clock.currentTimeMillis;
    const held = yield* SubscriptionRef.modify(clocks, (current) =>
      pipe(
        HashMap.get(current, id),
        Option.match({
          onNone: () => [false, current] as const,
          onSome: (timer) =>
            Match.value(timer).pipe(
              Match.tagsExhaustive({
                running: (running) =>
                  [
                    true,
                    HashMap.set(current, id, {
                      _tag: "paused",
                      totalMs: running.totalMs,
                      remainingMs: clampRemaining(
                        running.totalMs,
                        running.deadline - now,
                      ),
                    } as const),
                  ] as const,
                paused: () => [false, current] as const,
              }),
            ),
        }),
      ),
    );

    if (held) yield* FiberMap.remove(timers, id);
  });

  const resume = Effect.fn("ToastStore.resume")(function* (id: string) {
    const held = yield* SubscriptionRef.modify(clocks, (current) =>
      pipe(
        HashMap.get(current, id),
        Option.match({
          onNone: () =>
            [Option.none<Timer & { _tag: "paused" }>(), current] as const,
          onSome: (timer) =>
            Match.value(timer).pipe(
              Match.tagsExhaustive({
                running: () =>
                  [Option.none<Timer & { _tag: "paused" }>(), current] as const,
                paused: (paused) => [Option.some(paused), current] as const,
              }),
            ),
        }),
      ),
    );

    yield* Option.match(held, {
      onNone: () => Effect.void,
      onSome: (paused) =>
        paused.remainingMs <= 0
          ? Effect.andThen(drop(id), forget(id))
          : schedule(id, paused.remainingMs, paused.totalMs),
    });
  });

  const push = Effect.fn("ToastStore.push")(function* (draft: ToastDraft) {
    const input = yield* decodeDraft(draft);
    const { toast, expired } = yield* SubscriptionRef.modify(
      state,
      (current) => {
        const toast = new Toast({
          id: String(current.seq + 1),
          title: input.title,
          description: input.description,
          action: input.action,
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
    yield* Effect.forEach(expired, forget, { concurrency: 1, discard: true });

    const duration = Option.getOrElse(input.duration, () => fallback);
    if (dismisses(duration)) {
      yield* schedule(toast.id, Duration.toMillis(duration));
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
    timings: pipe(SubscriptionRef.get(clocks), Effect.flatMap(readTimings)),
    timingChanges: Stream.mapEffect(
      SubscriptionRef.changes(clocks),
      readTimings,
    ),
    push,
    dismiss,
    dismissAll,
    pause,
    resume,
  };
});

/** A layer holding one store, scoped to the runtime that provides it. */
export const layer = (options?: ToastStoreOptions): Layer.Layer<ToastStore> =>
  Layer.effect(ToastStore, makeToastStore(options));
