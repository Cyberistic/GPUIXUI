/**
 * The accessible description a part adds for its own state.
 *
 * GPUix 0.10.0 has no `aria-disabled`, so a part that drops its handlers and
 * dims is otherwise announced as an ordinary control. `aria-description` is
 * supported, so a disabled part appends "Disabled" to whatever description the
 * caller or the component already supplies (plan 516).
 */

import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";

/** The host prop a part spreads after its own props. Empty when enabled. */
export interface StateDescription {
  readonly "aria-description"?: string;
}

/**
 * Join the non-empty descriptions a part has, then add "Disabled" when it is
 * inert. The caller's description is passed first and is never replaced.
 */
export const stateDescription = (
  disabled: boolean,
  ...authored: ReadonlyArray<string | undefined>
): StateDescription =>
  pipe(
    authored,
    Arr.map((value) =>
      pipe(
        Option.fromNullishOr(value),
        Option.map(Str.trim),
        Option.filter(Str.isNonEmpty),
      ),
    ),
    Arr.getSomes,
    Arr.appendAll(disabled ? ["Disabled"] : []),
    Arr.dedupe,
    Arr.match({
      onEmpty: () => ({}),
      onNonEmpty: (parts) => ({ "aria-description": Arr.join(parts, ". ") }),
    }),
  );
