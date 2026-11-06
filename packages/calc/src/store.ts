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
