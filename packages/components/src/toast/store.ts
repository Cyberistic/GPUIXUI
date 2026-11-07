import { Effect, pipe } from "effect";
import * as Arr from "effect/Array";
import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as Duration from "effect/Duration";
import * as FiberMap from "effect/FiberMap";
import * as HashMap from "effect/HashMap";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Ref from "effect/Ref";
import type * as Scope from "effect/Scope";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import * as SubscriptionRef from "effect/SubscriptionRef";
import { Toast, ToastInput, type ToastDraft } from "./model.js";

interface State {
  readonly seq: number;
  readonly toasts: ReadonlyArray<Toast>;
}

export interface ToastStoreService {
  readonly toasts: Effect.Effect<ReadonlyArray<Toast>>;

  readonly changes: Stream.Stream<ReadonlyArray<Toast>>;

  readonly push: (
    draft: ToastDraft,
  ) => Effect.Effect<Toast, Schema.SchemaError>;

  readonly update: (
    id: string,
    draft: ToastDraft,
  ) => Effect.Effect<Option.Option<Toast>, Schema.SchemaError>;

  readonly dismiss: (id: string) => Effect.Effect<void>;

  readonly dismissAll: Effect.Effect<void>;

  readonly pause: (id: string) => Effect.Effect<void>;

  readonly resume: (id: string) => Effect.Effect<void>;

  readonly hold: (held: boolean) => Effect.Effect<void>;
}

export class ToastStore extends Context.Service<
  ToastStore,
  ToastStoreService
>()("gpuixui/components/ToastStore") {}

export interface ToastStoreOptions {
  readonly max?: number;

  readonly defaultDuration?: Duration.Input;
}

const DEFAULT_MAX = 3;
const DEFAULT_DURATION = Duration.seconds(5);

const keepCount = (requested: number | undefined): number => {
  const value = requested ?? DEFAULT_MAX;
  return Number.isFinite(value) ? Math.max(1, Math.trunc(value)) : DEFAULT_MAX;
};

const decodeDraft = Schema.decodeUnknownEffect(ToastInput);

const dismisses = (duration: Duration.Duration): boolean =>
  Duration.isFinite(duration) && Duration.toMillis(duration) > 0;

export const makeToastStore = Effect.fn("ToastStore.make")(function* (
  options?: ToastStoreOptions,
): Effect.fn.Return<ToastStoreService, never, Scope.Scope> {
  const max = keepCount(options?.max);
  const fallback = pipe(
    Duration.fromInput(options?.defaultDuration ?? DEFAULT_DURATION),
    Option.getOrElse(() => DEFAULT_DURATION),
  );

  const state = yield* SubscriptionRef.make<State>({ seq: 0, toasts: [] });
  const timers = yield* FiberMap.make<string>();

  const deadlines = yield* Ref.make(HashMap.empty<string, number>());

  const paused = yield* Ref.make(HashMap.empty<string, number>());

  const held = yield* Ref.make(false);

  const drop = Effect.fnUntraced(function* (id: string) {
    yield* SubscriptionRef.update(state, (current) => ({
      ...current,
      toasts: Arr.filter(current.toasts, (toast) => toast.id !== id),
    }));
  });

  const forget = Effect.fnUntraced(function* (id: string) {
    yield* FiberMap.remove(timers, id);
    yield* Ref.update(deadlines, HashMap.remove(id));
    yield* Ref.update(paused, HashMap.remove(id));
  });

  const schedule = Effect.fnUntraced(function* (id: string, millis: number) {
    if (yield* Ref.get(held)) {
      yield* Ref.update(paused, HashMap.set(id, millis));
      return;
    }
    const now = yield* Clock.currentTimeMillis;
    yield* Ref.update(deadlines, HashMap.set(id, now + millis));
    yield* FiberMap.run(
      timers,
      id,
      Effect.sleep(Duration.millis(millis)).pipe(
        Effect.andThen(drop(id)),
        Effect.ensuring(Ref.update(deadlines, HashMap.remove(id))),
      ),
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
    yield* Ref.set(deadlines, HashMap.empty());
    yield* Ref.set(paused, HashMap.empty());
  })();

  const pause = Effect.fn("ToastStore.pause")(function* (id: string) {
    const now = yield* Clock.currentTimeMillis;
    const remaining = yield* Ref.modify(deadlines, (current) =>
      pipe(
        HashMap.get(current, id),
        Option.match({
          onNone: () => [Option.none<number>(), current] as const,
          onSome: (deadline) =>
            [
              Option.some(Math.max(0, deadline - now)),
              HashMap.remove(current, id),
            ] as const,
        }),
      ),
    );

    yield* Option.match(remaining, {
      onNone: () => Effect.void,
      onSome: (millis) =>
        Effect.gen(function* () {
          yield* FiberMap.remove(timers, id);
          yield* Ref.update(paused, HashMap.set(id, millis));
        }),
    });
  });

  const resume = Effect.fn("ToastStore.resume")(function* (id: string) {
    const remaining = yield* Ref.modify(paused, (current) =>
      pipe(
        HashMap.get(current, id),
        Option.match({
          onNone: () => [Option.none<number>(), current] as const,
          onSome: (millis) =>
            [Option.some(millis), HashMap.remove(current, id)] as const,
        }),
      ),
    );

    yield* Option.match(remaining, {
      onNone: () => Effect.void,
      onSome: (millis) => (millis <= 0 ? drop(id) : schedule(id, millis)),
    });
  });

  const hold = Effect.fn("ToastStore.hold")(function* (value: boolean) {
    yield* Ref.set(held, value);
    const current = yield* SubscriptionRef.get(state);

    yield* Effect.forEach(
      current.toasts,
      (toast) => (value ? pause(toast.id) : resume(toast.id)),
      { concurrency: 1, discard: true },
    );
  });

  const replace = Effect.fnUntraced(function* (
    id: string,
    build: (current: Toast) => Toast,
  ) {
    const existing = Arr.findFirst(
      (yield* SubscriptionRef.get(state)).toasts,
      (toast) => toast.id === id,
    );
    if (Option.isNone(existing)) return Option.none<Toast>();
    const next = build(existing.value);
    yield* SubscriptionRef.update(state, (current) => ({
      ...current,
      toasts: Arr.map(current.toasts, (toast) =>
        toast.id === id ? next : toast,
      ),
    }));
    return Option.some(next);
  });

  const update = Effect.fn("ToastStore.update")(function* (
    id: string,
    draft: ToastDraft,
  ) {
    const input = yield* decodeDraft(draft);

    yield* forget(id);
    const replaced = yield* replace(
      id,
      (current) =>
        new Toast({
          id: current.id,
          title: input.title,
          description: input.description,
          action: input.action,
          tone: input.tone,
          phase: input.phase,
        }),
    );

    if (Option.isNone(replaced)) return replaced;

    const duration = Option.getOrElse(input.duration, () => fallback);
    if (replaced.value.phase === "settled" && dismisses(duration)) {
      yield* schedule(id, Duration.toMillis(duration));
    }
    return replaced;
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
          phase: input.phase,
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

    yield* Effect.forEach(expired, forget, { concurrency: 1, discard: true });

    const duration = Option.getOrElse(input.duration, () => fallback);
    if (toast.phase === "settled" && dismisses(duration)) {
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
    push,
    update,
    dismiss,
    dismissAll,
    pause,
    resume,
    hold,
  };
});

export const layer = (options?: ToastStoreOptions): Layer.Layer<ToastStore> =>
  Layer.effect(ToastStore, makeToastStore(options));
