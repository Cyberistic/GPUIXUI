import { readFileSync } from "node:fs";
import {
  CARD_BASE,
  CARD_CONTENT,
  CARD_VARIANTS,
  FIELDSET_ROOT,
  classesToStyle,
} from "@gpuixui/tw";
import { themes } from "@gpuixui/tokens";
import type { StyleDesc } from "@gpuix/react";
import { describe, expect, it } from "vitest";

/**
 * The fieldset drawings sit on the card's surface.
 *
 * The bug: the group was a bare 1px outline on the page background — a box with
 * no fill, so the fields inside it sat on nothing — while the card is the
 * surface this library groups content on. `FIELDSET_ROOT` and both drawings
 * (the Fieldset page's `role="group"` and the Field page's native `<fieldset>`)
 * now paint the card's fill, fixed corner, 16px padding and `input` edge, and
 * this holds them to `CARD_*` so none of the four can move alone.
 */

const css = readFileSync(
  new URL("../../styles/demos.css", import.meta.url),
  "utf8",
).replaceAll(/\/\*[\s\S]*?\*\//g, "");

/** The declarations of the one rule whose selector list names `selector`. */
const ruleFor = (selector: string): string => {
  const found = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find(([, list]) =>
    (list ?? "").split(",").some((name) => name.trim() === selector),
  );
  return found === undefined
    ? expect.fail(`the sheet has no rule for ${selector}`)
    : (found[2] ?? "");
};

/** The four declarations that make a box a surface. */
const SURFACE = [
  "backgroundColor",
  "borderRadius",
  "borderWidth",
  "borderColor",
] as const;

const surfaceOf = (style: StyleDesc): ReadonlyArray<unknown> =>
  SURFACE.map((key) => style[key]);

describe("the fieldset group", () => {
  it("paints the card's fill, corner and edge", () => {
    const group = classesToStyle(FIELDSET_ROOT, themes.dark).style;
    const card = classesToStyle(
      `${CARD_BASE} ${CARD_VARIANTS.outline}`,
      themes.dark,
    ).style;

    expect(surfaceOf(group)).toEqual(surfaceOf(card));
    // The card's own gutter, so a field clears the edge exactly as a row does.
    expect(group.padding).toBe(
      classesToStyle(CARD_CONTENT, themes.dark).style.paddingLeft,
    );
  });

  it("mirrors that surface in both drawings", () => {
    const group = classesToStyle(FIELDSET_ROOT, themes.dark).style;
    const drawn = ruleFor(".gx-fieldset");

    expect(drawn).toContain("background: var(--card)");
    expect(drawn).toContain("border: 1px solid var(--input)");
    expect(drawn).toContain("border-radius: var(--radius-lg)");
    expect(drawn).toContain(`padding: ${group.padding}px`);
  });

  it("gives the Field page's group the same box, not a copy of it", () => {
    expect(ruleFor(".gx-field-set")).toBe(ruleFor(".gx-fieldset"));
  });
});
