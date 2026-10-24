import { pipe } from "effect";
import * as Option from "effect/Option";
import * as Str from "effect/String";

/**
 * A stored text value, read at the boundary.
 *
 * A draft restored from storage, or read out of a saved record, writes `null`
 * where it carried no text, and the render paths read the value directly
 * (`.trim()`, `.length`, a key handler). Anything that is not a string carries
 * nothing. The text is **not** trimmed: the document's own spacing and newlines
 * are content.
 */
export const textOf = (value: unknown): string =>
  typeof value === "string" ? value : "";

/**
 * A stored accessible name, read at the boundary.
 *
 * Names are content a record carries as often as a literal — a saved panel's
 * title, an i18n row, a settings row — so one arrives as whatever the store
 * wrote: `null` for a key it never carried, a number a column held, an object a
 * decoder answered. A name is trimmed (an announcement is not a paint: a run of
 * spaces names nothing) and anything that is not a string names nothing, the
 * answer `accessibleName` gives a blank label. A number is **not** a name here,
 * which is the difference from {@link textOf}: reading `42` as `"42"` would
 * announce a value the caller never wrote.
 *
 * Absent is `undefined` rather than `Option.none` because that is what every
 * consumer does with it: spreads a name only when there is one, or falls back to
 * the documented default with `??`.
 */
export const nameOf = (value: unknown): string | undefined =>
  pipe(
    Option.some(textOf(value)),
    Option.map(Str.trim),
    Option.filter(Str.isNonEmpty),
    Option.getOrUndefined,
  );
