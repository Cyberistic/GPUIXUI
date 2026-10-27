/**
 * The picker's open state, in the package's local-store seam.
 *
 * `DatePicker` is a controlled `Popover`: the state belongs to the picker, not to
 * the surface, so a selection can close it and hand focus back to the trigger
 * from the same handler that reported the value.
 */

import { Effect } from "effect";
import { makeLocalState, type LocalState } from "../internal/local-state.js";

/** The open flag, and the one write that moves it. */
export interface PickerOpen {
  readonly local: LocalState<boolean>;
  readonly set: (open: boolean) => Effect.Effect<void>;
}

/** A closed picker's store. */
export const makePickerOpen = Effect.gen(function* () {
  const local = yield* makeLocalState(false);
  return { local, set: local.write };
});
