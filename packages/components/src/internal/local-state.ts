import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Duration from "effect/Duration";
import * as Fiber from "effect/Fiber";
import * as Option from "effect/Option";
import * as Ref from "effect/Ref";
import * as SubscriptionRef from "effect/SubscriptionRef";
import { useEffect, useState, useSyncExternalStore } from "react";

export interface LocalState<A> {
  readonly state: SubscriptionRef.SubscriptionRef<A>;

  readonly read: () => A;

  readonly subscribe: (listener: () => void) => () => void;

  readonly write: (next: A) => Effect.Effect<void>;

  readonly after: (
    millis: number,
    effect: Effect.Effect<void>,
  ) => Effect.Effect<void>;

  readonly cancel: Effect.Effect<void>;

  readonly running: () => boolean;
}

export const makeLocalState = <A>(initial: A): Effect.Effect<LocalState<A>> =>
  Effect.gen(function* () {
    const state = yield* SubscriptionRef.make(initial);
    const timer = yield* Ref.make(Option.none<Fiber.Fiber<void>>());
    const listeners = yield* Ref.make<ReadonlyArray<() => void>>(Arr.empty());

    const write = Effect.fnUntraced(function* (next: A) {
      yield* SubscriptionRef.set(state, next);
      const subscribers = yield* Ref.get(listeners);
      yield* Effect.sync(() => {
        Arr.forEach(subscribers, (listener) => listener());
      });
    });

    const cancel = Effect.gen(function* () {
      const held = yield* Ref.getAndSet(timer, Option.none());
      yield* Option.match(held, {
        onNone: () => Effect.void,
        onSome: Fiber.interrupt,
      });
    });

    const after = Effect.fnUntraced(function* (
      millis: number,
      effect: Effect.Effect<void>,
    ) {
      yield* cancel;
      const fiber = yield* Effect.forkDetach(
        Effect.sleep(Duration.millis(millis)).pipe(Effect.andThen(effect)),
      );
      yield* Ref.set(timer, Option.some(fiber));
    });

    const running = (): boolean =>
      Option.exists(
        Ref.getUnsafe(timer),
        (fiber) => fiber.pollUnsafe() === undefined,
      );

    const subscribe = (listener: () => void): (() => void) => {
      Effect.runSync(
        Ref.update(listeners, (current) => Arr.append(current, listener)),
      );
      return () => {
        Effect.runSync(
          Ref.update(listeners, (current) =>
            Arr.filter(current, (held) => held !== listener),
          ),
        );
      };
    };

    return {
      state,

      read: () => SubscriptionRef.getUnsafe(state),
      subscribe,
      write,
      after,
      cancel,
      running,
    };
  });

interface Teardown {
  readonly local: { readonly cancel: Effect.Effect<void> };
}

export const useLocalStore = <Store extends Teardown>(
  make: Effect.Effect<Store>,
): Store => {
  const [store] = useState(() => Effect.runSync(make));
  useEffect(() => () => send(store.local.cancel), [store]);
  return store;
};

export const send = (command: Effect.Effect<void>): void => {
  Effect.runFork(command);
};

export const useLocalState = <A>(local: LocalState<A>): A =>
  useSyncExternalStore(local.subscribe, local.read, local.read);

export const useLocalSlice = <A, B>(
  local: LocalState<A>,
  select: (state: A) => B,
): B =>
  useSyncExternalStore(
    local.subscribe,
    () => select(local.read()),
    () => select(local.read()),
  );
