/**
 * The accessible description a part adds for state it derives itself.
 *
 * GPUix 0.10.0 has no `aria-disabled` and no `aria-current`, so a part that
 * drops its handlers and dims is otherwise announced as an ordinary control,
 * and a progress row's complete/upcoming state exists only as colour.
 * `aria-description` is supported, so a part appends its own state to whatever
 * description the caller already supplies (plans 516 and 626).
 */

import { Match, pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";

/** The host prop a part spreads after its own props. Empty when there is no
 *  state to describe. */
export interface StateDescription {
  readonly "aria-description"?: string;
}

/** The three states a progress list reports. */
export type ProgressStatus = "complete" | "current" | "upcoming";

const statusText = (status: ProgressStatus): string =>
  Match.value(status).pipe(
    Match.when("complete", () => "Complete"),
    Match.when("current", () => "Current"),
    Match.when("upcoming", () => "Upcoming"),
    Match.exhaustive,
  );

/** Join the non-empty parts once, dropping a repeated phrase. */
const joined = (
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
    Arr.dedupe,
    Arr.match({
      onEmpty: () => ({}),
      onNonEmpty: (parts) => ({ "aria-description": Arr.join(parts, ". ") }),
    }),
  );

/**
 * Join the non-empty descriptions a part has, then add "Disabled" when it is
 * inert. The caller's description is passed first and is never replaced.
 */
export const stateDescription = (
  disabled: boolean,
  ...authored: ReadonlyArray<string | undefined>
): StateDescription => joined(...authored, disabled ? "Disabled" : undefined);

/**
 * Add a progress row's status to the caller's description, so a reader hears
 * "Complete", "Current" or "Upcoming" rather than colour alone.
 */
export const statusDescription = (
  status: ProgressStatus,
  authored?: string,
): StateDescription => joined(authored, statusText(status));
