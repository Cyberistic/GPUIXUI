import type { StaggerFrom } from "@gpuixui/motion/timeline";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as SubscriptionRef from "effect/SubscriptionRef";
import { makeLocalState, type LocalState } from "@gpuixui/components/authoring";
import { splitUnits, type SplitLine, type SplitMode } from "./logic.js";

export interface SplitState {
  readonly text: string;
  readonly mode: SplitMode;

  readonly stepMs: Option.Option<number>;
  readonly from: StaggerFrom;
  readonly lines: ReadonlyArray<SplitLine>;
  readonly units: number;
}

export interface SplitInput {
  readonly text: string;
  readonly split: SplitMode;
  readonly stepMs: number | undefined;
  readonly from: StaggerFrom;
}

export interface SplittingStore {
  readonly local: LocalState<SplitState>;

  readonly show: (input: SplitInput) => Effect.Effect<void>;
}

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

const sameInput = (state: SplitState, input: SplitInput): boolean =>
  state.text === input.text &&
  state.mode === input.split &&
  state.from === input.from &&
  Option.getOrNull(state.stepMs) === (input.stepMs ?? null);

export const makeSplittingStore = (
  input: SplitInput,
): Effect.Effect<SplittingStore> =>
  Effect.gen(function* () {
    const local = yield* makeLocalState<SplitState>(splitOf(input));

    const show = Effect.fnUntraced(function* (next: SplitInput) {
      const current = yield* SubscriptionRef.get(local.state);
      if (sameInput(current, next)) return;
      yield* local.write(splitOf(next));
    });

    return { local, show };
  });
