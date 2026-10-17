/**
 * Guards the variant registry — the bug it catches is drift.
 *
 * A variant declared in `BUTTON_VARIANTS` with no table entry renders silently
 * as the default; two variants that resolve to the same paint are one variant
 * pretending to be two; a variant that declares no hover/press feedback cannot
 * be told apart from a disabled control; and a variant that hardcodes a colour
 * stops following the theme.
 */

import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Order from "effect/Order";
import { testTheme } from "./testing/theme.fixture.js";
import {
  buttonVariants,
  BUTTON_VARIANTS,
  hasPointerFeedback,
  variantKey,
  variantTable,
} from "./variants.js";

const namesOf = (entries: ReadonlyArray<{ readonly name: string }>): string[] =>
  entries.map((entry) => entry.name);

const keyOf = (
  name: (typeof BUTTON_VARIANTS)[number],
  theme = testTheme,
): string => variantKey(buttonVariants[name], theme);

describe("the button variant registry", () => {
  it("names every variant exactly once in the table", () => {
    const names = namesOf(variantTable);
    expect(Arr.sort(names, Order.String)).toEqual(
      Arr.sort([...BUTTON_VARIANTS], Order.String),
    );
    expect(new Set(names).size).toBe(BUTTON_VARIANTS.length);
  });

  it("resolves every variant to a distinct resting paint", () => {
    const keys = BUTTON_VARIANTS.map((name) => keyOf(name));
    expect(new Set(keys).size).toBe(BUTTON_VARIANTS.length);
  });

  it("gives every variant hover and press feedback", () => {
    expect(
      Arr.every(BUTTON_VARIANTS, (name) =>
        hasPointerFeedback(buttonVariants[name], testTheme),
      ),
    ).toBe(true);
  });

  it("reads paint from the theme, so only the variants that use a role move", () => {
    const recoloured = {
      ...testTheme,
      colors: { ...testTheme.colors, primary: "#ABCDEF" },
    };
    const changed = Arr.filter(
      BUTTON_VARIANTS,
      (name) => keyOf(name, recoloured) !== keyOf(name),
    );
    expect(Arr.sort([...changed], Order.String)).toEqual(["link", "primary"]);
  });
});
