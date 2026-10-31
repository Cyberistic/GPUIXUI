/**
 * The React seam.
 *
 * A component reads the store with `useSyncExternalStore` and presses keys with
 * the returned callbacks. This file is the only React import in `@gpuixui/calc`;
 * the engine itself stays renderer-free.
 */

import { Effect } from "effect";
import { useMemo, useSyncExternalStore } from "react";
import { makeCalculatorStore, type CalculatorStore } from "./store.js";
import type { CalculatorState } from "./session.js";

export interface UseCalculatorResult {
  readonly state: CalculatorState;
  readonly press: (key: string) => void;
  readonly run: CalculatorStore["run"];
  readonly store: CalculatorStore;
}

/** Use the supplied store, or create one for this component. */
export const useCalculator = (store?: CalculatorStore): UseCalculatorResult => {
  const held = useMemo(
    () => store ?? Effect.runSync(makeCalculatorStore()),
    [store],
  );
  const state = useSyncExternalStore(held.subscribe, held.read, held.read);
  return { state, press: held.press, run: held.run, store: held };
};

export type { CalculatorStore };
