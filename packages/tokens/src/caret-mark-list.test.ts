/**
 * Guards the defect plan 563 fixes: `markPairs` is documented and published as
 * every mark the contract measures, but plan 557 added the native field's caret
 * (`caretPairs`: `primaryText` on the `input` fill) straight to `contrastPairs`.
 * A consumer building a mark table from the public list — and the design
 * system's graphic-marks floor row, which `docs.test.ts` derives from that list —
 * therefore omitted the one mark a native field paints. The checker enforced the
 * pair, so a copied theme could not erase a caret; the list and the page were the
 * incomplete halves, and the guard that should have caught the page read the
 * incomplete list.
 */

import { describe, expect, it } from "vitest";
import {
  caretPairs,
  contrastFloors,
  contrastPairs,
  extendTheme,
  getTheme,
  markPairs,
  themeContrastFailures,
} from "./index.js";

describe("the caret is a mark", () => {
  it("lives in the published mark list", () => {
    caretPairs.forEach((pair) => {
      expect(markPairs).toContainEqual(pair);
    });
    expect(markPairs).toContainEqual(["primaryText", "input", "mark"]);
  });

  it("is reported once by the contract", () => {
    const reported = contrastPairs.filter(
      ([foreground, background]) =>
        foreground === "primaryText" && background === "input",
    );
    expect(reported).toEqual([["primaryText", "input", "mark"]]);
  });

  it("is held to the mark floor on the fill a native field paints", () => {
    const base = getTheme("light");
    const erased = extendTheme(base, {
      colors: { primaryText: base.colors.input },
    });
    expect(themeContrastFailures(erased)).toContainEqual(
      expect.objectContaining({
        foreground: "primaryText",
        background: "input",
        pairClass: "mark",
        floor: contrastFloors.default.mark,
      }),
    );
  });

  it("keeps the slider thumb's own marks beside it", () => {
    (["primary", "destructive"] as const).forEach((role) => {
      expect(markPairs).toContainEqual([role, "input", "mark"]);
    });
  });
});
