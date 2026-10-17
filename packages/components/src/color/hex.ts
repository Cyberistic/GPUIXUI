/**
 * Hex colour values: one normal form, one guard.
 *
 * The public value is always lowercase `#rrggbb`. Shorthand (`#abc`) and a
 * missing `#` are accepted at the boundary and expanded; 4/8-digit alpha forms
 * are refused in v1 because the picker has no alpha control.
 */

import * as Option from "effect/Option";
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
