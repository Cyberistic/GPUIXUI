/**
 * Hex colour values: one normal form, one guard.
 *
 * The public value is always lowercase `#rrggbb`. Shorthand (`#abc`) and a
 * missing `#` are accepted at the boundary and expanded; 4/8-digit alpha forms
 * are refused in v1 because the picker has no alpha control.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import * as Schema from "effect/Schema";
import * as Str from "effect/String";

/** A normalised six-digit hex colour. */
export const HexColor = Schema.String.check(
  Schema.isPattern(/^#[0-9a-f]{6}$/, {
    identifier: "HexColorPattern",
    title: "Hex Colour",
    description: "A lowercase six-digit hex colour, including the leading #.",
    message: "Expected a lowercase #rrggbb colour",
  }),
).pipe(Schema.brand("HexColor"));

/** A normalised hex colour. */
export type HexColor = typeof HexColor.Type;

/** Whether `value` is already in normal form. */
export const isHexColor = Schema.is(HexColor);

/** Normalise `#abc`, `abc`, `#AABBCC` or `AABBCC`; `None` for anything else. */
export const normalizeHex = (input: string): Option.Option<HexColor> => {
  const bare = Str.toLowerCase(Str.replace(/^#/, "")(Str.trim(input)));
  const expanded =
    bare.length === 3
      ? Str.split("")(bare)
          .map((digit) => `${digit}${digit}`)
          .join("")
      : bare;
  const value = `#${expanded}`;
  return isHexColor(value) ? Option.some(value) : Option.none();
};

/** Whether two hex inputs describe the same colour. */
export const sameHex = (left: string, right: string): boolean =>
  Option.match(Option.all([normalizeHex(left), normalizeHex(right)]), {
    onNone: () => false,
    onSome: ([a, b]) => a === b,
  });

/**
 * The draft a stored value carries: the text as written, or absence.
 *
 * A colour is saved with the control — a settings pane, a saved brand — and a
 * store writes `null` where it carried none. The picker normalised that value
 * before it painted, so the absence threw out of the render. Text is kept
 * **as written**, because a partial hex (`#12`) is a draft a reader is typing,
 * not a value to rewrite; anything that is not text is the absence the
 * controlled prop already reads as uncontrolled.
 */
export const storedDraft = (value: unknown): Option.Option<string> =>
  P.isString(value) ? Option.some(value) : Option.none();

/**
 * The swatch list a stored value carries: its text entries, or absence.
 *
 * A palette is saved data as often as a literal — a brand's colours live in a
 * settings record — and `.map` over a record's `null` threw the picker out of
 * the render. Only a list is a list, and an entry that is not a colour is not a
 * swatch: it is dropped, so a hole cannot hide the swatches beside it. A blank
 * entry is dropped too, because a swatch with no word paints an unnamed button.
 * An empty list stays empty — it is a caller's own choice, not the theme's
 * defaults.
 */
export const storedSwatches = (
  value: unknown,
): Option.Option<ReadonlyArray<string>> =>
  Arr.isArray(value)
    ? Option.some(
        Arr.filter(Arr.filter(value, P.isString), (entry) =>
          Str.isNonEmpty(Str.trim(entry)),
        ),
      )
    : Option.none();
