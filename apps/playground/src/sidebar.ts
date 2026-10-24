/**
 * The playground sidebar's keyboard contract, as a pure rule.
 *
 * A registry of every entry was one tab stop per row, so a keyboard reader paid
 * a press per scenario to reach the stage and no key moved between rows. The
 * list is one **roving** stop now — the open row carries `tabIndex: 0`, every
 * other row `-1` — and these are the keys it owns: an arrow steps the cursor
 * and clamps at the ends, Home and End jump to them.
 *
 * Clamping rather than wrapping is the rule the library's own lists measured
 * (`grid-focus-lifecycle`: an edge clamps; `focus-reveal-lifecycle`: an arrow
 * moves the cursor, the focus and the scroller together), so the playground's
 * own shell behaves like the widgets it demonstrates.
 */
import { Match } from "effect";
import * as Option from "effect/Option";
import * as Number from "effect/Number";

/**
 * The row a key moves the cursor to, or `none` for a key the list does not own.
 *
 * `cursor` is the index the open row sits at, so a stored cursor outside the
 * list is clamped rather than trusted — a row removed from the registry must
 * not point the arrows past the end.
 */
export const sidebarCursor = (
  key: string | undefined,
  cursor: number,
  count: number,
): Option.Option<number> => {
  if (count <= 0) return Option.none();
  const step: (index: number) => number = Number.clamp({
    minimum: 0,
    maximum: count - 1,
  });
  return Match.value(key).pipe(
    Match.when("down", () => Option.some(step(cursor + 1))),
    Match.when("up", () => Option.some(step(cursor - 1))),
    Match.when("home", () => Option.some(step(0))),
    Match.when("end", () => Option.some(step(count - 1))),
    Match.orElse(() => Option.none()),
  );
};
