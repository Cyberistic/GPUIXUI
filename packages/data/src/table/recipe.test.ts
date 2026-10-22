/**
 * The table recipes compile to the roles and metrics the parts paint.
 *
 * A table is the first surface in the library whose rows and header are separate
 * scrollers, so a silent compile failure (a class the registry cannot express)
 * would leave a part unpainted rather than throwing. This suite holds every
 * recipe to `unsupported: []`, the selected row's wash and label role to the
 * theme's own, and the header/body chrome to the border role the runtime paints
 * with a `borderBottomWidth`.
 */

import { describe, expect, it } from "vitest";
import { darkTheme, lightTheme } from "@gpuixui/tokens";
import { classesToStyle } from "@gpuixui/tw";
import * as Arr from "effect/Array";
import {
  TABLE_BODY,
  TABLE_CAPTION,
  TABLE_CELL,
  TABLE_COLUMN_DIVIDER,
  TABLE_EMPTY,
  TABLE_HEADER,
  TABLE_HEADER_CELL,
  TABLE_ROOT,
  TABLE_ROW,
  TABLE_ROW_INTERACTIVE,
  TABLE_ROW_SELECTED,
  TABLE_SKELETON_BAR,
  TABLE_VIEWPORT,
} from "./recipe.js";

const recipes: ReadonlyArray<readonly [string, string]> = [
  ["root", TABLE_ROOT],
  ["viewport", TABLE_VIEWPORT],
  ["header", TABLE_HEADER],
  ["body", TABLE_BODY],
  ["row", TABLE_ROW],
  ["selected row", TABLE_ROW_SELECTED],
  ["interactive row", TABLE_ROW_INTERACTIVE],
  ["header cell", TABLE_HEADER_CELL],
  ["column divider", TABLE_COLUMN_DIVIDER],
  ["cell", TABLE_CELL],
  ["caption", TABLE_CAPTION],
  ["empty", TABLE_EMPTY],
  ["skeleton bar", TABLE_SKELETON_BAR],
];

describe("the table recipes", () => {
  it("compile every recipe with nothing unsupported", () => {
    const unsupported = Arr.flatMap(recipes, ([name, recipe]) =>
      Arr.map(
        classesToStyle(recipe, darkTheme).unsupported,
        (token) => `${name}: ${token}`,
      ),
    );
    expect(unsupported).toEqual([]);
  });

  it("paints the chosen row in the theme's selection pair", () => {
    const style = classesToStyle(TABLE_ROW_SELECTED, lightTheme).style;
    expect(style.backgroundColor).toBe(lightTheme.colors.selected);
    expect(style.color).toBe(lightTheme.colors.selectedForeground);
  });

  it("keeps the selection wash under the pointer only on a chosen row", () => {
    const selected = classesToStyle(TABLE_ROW_SELECTED, darkTheme).style;
    const interactive = classesToStyle(TABLE_ROW_INTERACTIVE, darkTheme).style;
    expect(selected.hover).toBeUndefined();
    expect(interactive.hover?.backgroundColor).toBe(darkTheme.colors.hover);
  });

  it("gives the header and body the same horizontal inset", () => {
    const header = classesToStyle(TABLE_HEADER_CELL, lightTheme).style;
    const cell = classesToStyle(TABLE_CELL, lightTheme).style;
    expect(header.paddingLeft).toBe(cell.paddingLeft);
    expect(header.paddingRight).toBe(cell.paddingRight);
    expect(header.paddingTop).toBe(cell.paddingTop);
  });

  it("paints the loading bar in the skeleton role", () => {
    const style = classesToStyle(TABLE_SKELETON_BAR, lightTheme).style;
    expect(style.backgroundColor).toBe(lightTheme.colors.skeleton);
    expect(style.height).toBe(8);
  });

  it("leaves a body cell unfilled, so a press reaches its row", () => {
    const cell = classesToStyle(TABLE_CELL, lightTheme).style;
    // A fill is where GPUI's hit test stops (`press-routing-lifecycle`): a
    // painted cell swallows the press its row answers.
    expect(cell.backgroundColor).toBeUndefined();
  });

  it("places the resize strip on the header cell's own edge", () => {
    const cell = classesToStyle(TABLE_HEADER_CELL, lightTheme).style;
    const divider = classesToStyle(TABLE_COLUMN_DIVIDER, lightTheme).style;

    // A divider needs a containing block; without it the strip is placed
    // against the window rather than its column, and every row drifts.
    expect(cell.position).toBe("relative");
    expect(divider.position).toBe("absolute");
    expect(divider.right).toBe(0);
    expect(divider.width).toBe(6);
    // The strip paints a fill at rest, because GPUI's hit test stops at the
    // first painted child: a transparent strip never receives the press.
    expect(divider.backgroundColor).toBe(lightTheme.colors.border);
    expect(divider.hover?.backgroundColor).toBe(lightTheme.colors.primary);
  });
});
