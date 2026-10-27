/**
 * SplittingText's phrase and the units it paints, held in Effect.
 *
 * A reveal has no clock of its own — the stagger is a delay on each unit's
 * motion, and the runtime's tween is the journey — so the state a component has
 * to keep is the **split**: which units a phrase becomes, and therefore which
 * keys the runtime remounts when the phrase changes. Splitting a character
 * reveal of a long headline into a fresh array on every render is work the
 * renderer does not need, and it is the one thing the component remembers across
 * a paint. A phrase, a mode or a step that has not changed writes nothing.
 */

import type { StaggerFrom } from "@gpuixui/motion/timeline";
import { Option } from "effect";
import * as Arr from "effect/Array";
import { makeEffectStore, type EffectStore } from "../internal/effect-store.js";
import { splitUnits, type SplitLine, type SplitMode } from "./logic.js";

/** What one phrase splits into, with the settings that produced it. */
export interface SplitState {
  readonly text: string;
  readonly mode: SplitMode;
  /** Absent when the caller left the step to the house rule. */
  readonly stepMs: Option.Option<number>;
  readonly from: StaggerFrom;
  readonly lines: ReadonlyArray<SplitLine>;
  readonly units: number;
}

/** The input one reveal is asked to paint. */
export interface SplitInput {
  readonly text: string;
  readonly split: SplitMode;
  readonly stepMs: number | undefined;
  readonly from: StaggerFrom;
}

/** {@link SplitState} and the event that moves it. */
export interface SplittingStore extends EffectStore<SplitState> {
  /** Split `input`, unless it is the phrase already painted. */
  readonly show: (input: SplitInput) => void;
}

/** The reveal `input` describes, split for the renderer. */
const splitOf = (input: SplitInput): SplitState => {
  const lines = splitUnits(input.text, {
    mode: input.split,
    stepMs: input.stepMs,
    from: input.from,
  });
  return {
    text: input.text,
    mode: input.split,
    stepMs: Option.fromNullishOr(input.stepMs),
    from: input.from,
    lines,
    units: Arr.reduce(lines, 0, (count, line) => count + line.units.length),
  };
};

/** Whether `state` already describes `input`. */
const sameInput = (state: SplitState, input: SplitInput): boolean =>
  state.text === input.text &&
  state.mode === input.split &&
  state.from === input.from &&
  Option.getOrNull(state.stepMs) === (input.stepMs ?? null);

/** A store holding `input`'s split. */
export const makeSplittingStore = (input: SplitInput): SplittingStore => {
  const store = makeEffectStore(splitOf(input));

  return {
    ...store,
    show: (next) => {
      if (sameInput(store.read(), next)) return;
      store.set(splitOf(next));
    },
  };
};
