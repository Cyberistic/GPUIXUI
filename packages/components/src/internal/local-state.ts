/**
 * The seam between a component's local Effect store and React.
 *
 * A surface that owns a pointer, a measured box or a phase keeps it in a
 * `SubscriptionRef`, not in `useState`: the ref is the single source of truth,
 * {@link LocalState.write} is the only way it changes, and React subscribes
 * through {@link useLocalState}. The subscriber is called in the same turn as
 * the write, because `useSyncExternalStore` reads its snapshot as soon as the
 * handler that changed the store returns — a stream hop would land after the
 * frame, which is the frame a reader (and a behaviour suite) sees.
 *
 * {@link LocalState.after} holds the one timer such a store can run — a layer
 * that outlives its tween. It replaces the timer already running and
 * {@link LocalState.cancel}, the component's teardown, interrupts it, so no
 * sleep outlives the tree that scheduled it.
 *
 * `Effect.run*` lives here and nowhere else among these components (EF-21):
 * building a store, subscribing to it and starting a command are the three
 * things a React render and a React handler need, and everything they reach is
 * an effect.
 */

import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Duration from "effect/Duration";
import * as Fiber from "effect/Fiber";
import * as Option from "effect/Option";
import * as Ref from "effect/Ref";
import * as SubscriptionRef from "effect/SubscriptionRef";
import { useEffect, useState, useSyncExternalStore } from "react";

/** One store's state, the subscription React reads it through, and its timer. */
export interface LocalState<A> {
  /** The single source of truth. */
  readonly state: SubscriptionRef.SubscriptionRef<A>;
  /** The current value, for `useSyncExternalStore`. */
  readonly read: () => A;
  /** Register a subscriber; the returned function unregisters it. */
  readonly subscribe: (listener: () => void) => () => void;
  /** Set the state, then signal every subscriber before the caller returns. */
  readonly write: (next: A) => Effect.Effect<void>;
  /** Run `effect` after `millis`, replacing the timer already running. */
  readonly after: (
    millis: number,
    effect: Effect.Effect<void>,
  ) => Effect.Effect<void>;
  /** Stop the timer; a store with none is unaffected. */
  readonly cancel: Effect.Effect<void>;
}

/** A store with its state at `initial`. */
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
      const running = yield* Ref.getAndSet(timer, Option.none());
      yield* Option.match(running, {
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
      // `getUnsafe` is the read `useSyncExternalStore` needs: the value as it
      // stands, in the turn the write signalled.
      read: () => SubscriptionRef.getUnsafe(state),
      subscribe,
      write,
      after,
      cancel,
    };
  });

/** What a local store hands the hook that owns its lifetime: the timer to stop. */
interface Teardown {
  readonly local: { readonly cancel: Effect.Effect<void> };
}

/**
 * One store for the life of the component.
 *
 * The factory is a module constant, so the store is built on the first render
 * and kept across every later one; the tree that owns it is the tree that
 * cancels the timer it may be running.
 */
export const useLocalStore = <Store extends Teardown>(
  make: Effect.Effect<Store>,
): Store => {
  const [store] = useState(() => Effect.runSync(make));
  useEffect(() => () => send(store.local.cancel), [store]);
  return store;
};

/**
 * Run a store command.
 *
 * The command's write lands before the handler that sent it returns, so the
 * tree the caller flushes next paints it.
 */
export const send = (command: Effect.Effect<void>): void => {
  Effect.runFork(command);
};

/** Subscribe a component to a store's state. */
export const useLocalState = <A>(local: LocalState<A>): A =>
  useSyncExternalStore(local.subscribe, local.read, local.read);

/**
 * Subscribe a component to one slice of a store's state.
 *
 * A field of many twinkling stars subscribes to the box it is laid out in, and
 * each star to its own turnaround, so one star's completion repaints only that
 * star. The selector must return a stable value for an unchanged slice — a
 * primitive, or the object already held — or React has no way to bail out.
 */
export const useLocalSlice = <A, B>(
  local: LocalState<A>,
  select: (state: A) => B,
): B =>
  useSyncExternalStore(
    local.subscribe,
    () => select(local.read()),
    () => select(local.read()),
  );
