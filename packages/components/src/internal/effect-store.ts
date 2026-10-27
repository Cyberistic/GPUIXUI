/**
 * The seam a component's state crosses from Effect into React.
 *
 * A component's state is one `SubscriptionRef` and the fibers that sequence its
 * work — an exit window, a pointer's frame. A handler writes with `set`; work
 * that outlives the call is a `fork` on the library's one runtime; `stop`
 * interrupts everything the store started, so a component's timers cannot
 * outlive it. React subscribes to the ref's change stream and paints the
 * snapshot, which is the same shape `toast/provider.tsx` uses and the reason no
 * component keeps business state in `useState`.
 *
 * `runSync` for a write and `runFork` for a fiber are the boundary (EF-21):
 * this module is where React meets the runtime, and nothing above it executes
 * an effect.
 */

import { Effect, Fiber, Stream, SubscriptionRef } from "effect";
import * as Arr from "effect/Array";
import { useEffect, useState, useSyncExternalStore } from "react";

/** A React component's state, in Effect. */
export interface EffectStore<State> {
  /** The snapshot React paints; the same object while nothing changed. */
  readonly read: () => State;
  /** Subscribe to a change; returns the unsubscribe. */
  readonly subscribe: (listener: () => void) => () => void;
  /** Write the state a handler computed. */
  readonly set: (next: State) => void;
  /** Start work that outlives the call; `stop` interrupts it. */
  readonly fork: (work: Effect.Effect<void>) => Fiber.Fiber<void>;
  /** Interrupt one piece of work early. */
  readonly cancel: (fiber: Fiber.Fiber<void>) => void;
  /** Interrupt every fiber the store started. */
  readonly stop: () => void;
}

/** A store over `initial`, with no React attached. */
export const makeEffectStore = <State>(initial: State): EffectStore<State> => {
  const state = Effect.runSync(SubscriptionRef.make(initial));
  /** Everything this store started, so the component's unmount ends it. */
  let running: ReadonlyArray<Fiber.Fiber<void>> = Arr.empty();

  const forget = (fiber: Fiber.Fiber<void>): void => {
    running = Arr.filter(running, (held) => held !== fiber);
  };

  return {
    read: () => SubscriptionRef.getUnsafe(state),
    subscribe: (listener) => {
      const fiber = Effect.runFork(
        Stream.runForEach(SubscriptionRef.changes(state), () =>
          Effect.sync(listener),
        ),
      );
      running = Arr.append(running, fiber);
      return () => {
        forget(fiber);
        Effect.runFork(Fiber.interrupt(fiber));
      };
    },
    set: (next) => {
      Effect.runSync(SubscriptionRef.set(state, next));
    },
    fork: (work) => {
      /** The fiber, once it exists; the finalizer may run before it does. */
      const started: { fiber?: Fiber.Fiber<void> } = {};
      let settled = false;
      const fiber = Effect.runFork(
        Effect.ensuring(
          work,
          Effect.sync(() => {
            settled = true;
            if (started.fiber !== undefined) forget(started.fiber);
          }),
        ),
      );
      started.fiber = fiber;
      if (!settled) running = Arr.append(running, fiber);
      return fiber;
    },
    cancel: (fiber) => {
      forget(fiber);
      Effect.runFork(Fiber.interrupt(fiber));
    },
    stop: () => {
      const held = running;
      running = Arr.empty();
      Arr.forEach(held, (fiber) => Effect.runFork(Fiber.interrupt(fiber)));
    },
  };
};

/** The snapshot React paints, re-read on every write to the store. */
export const useStoreSnapshot = <State>(store: EffectStore<State>): State =>
  useSyncExternalStore(store.subscribe, store.read);

/**
 * Create a store with its component and stop it when that component unmounts.
 *
 * The factory runs once: a store outlives every render but not the mount, so a
 * remount (a new key) starts a fresh state — what the component's own state did
 * before it moved into Effect.
 */
export const useOwnedStore = <Store extends { readonly stop: () => void }>(
  make: () => Store,
): Store => {
  const [store] = useState(make);
  useEffect(() => store.stop, [store]);
  return store;
};
