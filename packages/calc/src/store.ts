/**
 * The React-independent store.
 *
 * `SubscriptionRef` is the single source of truth; a subscriber is called in the
 * same turn as the write, because `useSyncExternalStore` reads the snapshot as
 * soon as the handler returns. `Effect.run*` lives at this boundary only — a
 * React handler and the app's mount are the two places that need to execute an
 * effect, and everything they reach is an effect.
 */

import { Effect } from "effect";
import * as SubscriptionRef from "effect/SubscriptionRef";
import type { CommandAction } from "./commands.js";
import {
  initialState,
  press,
  runAction,
  type CalculatorState,
} from "./session.js";

export interface CalculatorStore {
  readonly state: SubscriptionRef.SubscriptionRef<CalculatorState>;
  readonly read: () => CalculatorState;
  readonly subscribe: (listener: () => void) => () => void;
  readonly press: (key: string) => void;
  readonly run: (action: CommandAction) => void;
  readonly replace: (state: CalculatorState) => void;
}

/** Build a store around a fresh fx-991ES session. */
export const makeCalculatorStore = (
  initial: CalculatorState = initialState(),
): Effect.Effect<CalculatorStore> =>
  Effect.gen(function* () {
    const state = yield* SubscriptionRef.make(initial);
    const listeners = new Set<() => void>();
    const notify = (): void => {
      listeners.forEach((listener) => listener());
    };
    const replace = (next: CalculatorState): void => {
      Effect.runSync(SubscriptionRef.set(state, next));
      notify();
    };
    return {
      state,
      read: () => Effect.runSync(SubscriptionRef.get(state)),
      subscribe: (listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
      press: (key) => {
        const current = Effect.runSync(SubscriptionRef.get(state));
        replace(Effect.runSync(press(current, key)));
      },
      run: (action) => {
        const current = Effect.runSync(SubscriptionRef.get(state));
        replace(Effect.runSync(runAction(current, action)));
      },
      replace,
    };
  });
