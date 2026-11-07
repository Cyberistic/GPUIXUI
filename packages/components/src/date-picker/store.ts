import { Effect } from "effect";
import { makeLocalState, type LocalState } from "../internal/local-state.js";

export interface PickerOpen {
  readonly local: LocalState<boolean>;
  readonly set: (open: boolean) => Effect.Effect<void>;
}

export const makePickerOpen = Effect.gen(function* () {
  const local = yield* makeLocalState(false);
  return { local, set: local.write };
});
