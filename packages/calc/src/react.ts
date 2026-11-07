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

export const useCalculator = (store?: CalculatorStore): UseCalculatorResult => {
  const held = useMemo(
    () => store ?? Effect.runSync(makeCalculatorStore()),
    [store],
  );
  const state = useSyncExternalStore(held.subscribe, held.read, held.read);
  return { state, press: held.press, run: held.run, store: held };
};

export type { CalculatorStore };
