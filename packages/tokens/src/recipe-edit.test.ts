/**
 * Guards the defect plan 658 fixes: the recipe copy-and-own block in
 * `docs/tokens.md` told a reader to "edit a value" and changed only `primary`,
 * so the copied Aero dark theme kept the Windows black `primaryForeground` and
 * the old hover/pressed family. `themeFailures` rejected it seven times — the
 * label at **3.999:1** on the new fill and the fill as a mark at 2.696:1 on a
 * card, popover, the quiet panel and a field, 2.882:1 on the value groove and
 * 2.233:1 on the hover wash — while `snippets.test.ts` held only the brand maps
 * and no executed example owned a recipe edit. The page already warns that a
 * fill moves with its family (plan 310); this suite holds the fixed example to
 * that rule and keeps the pre-fix block as the fixture that proves the guard
 * can fail.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  applyPlatformStyle,
  contrastFloors,
  contrastRatio,
  getTheme,
  platformRecipes,
  shippedThemes,
  themeContrastFailures,
  themeFailures,
  type ContrastFailure,
} from "./index.js";
import { editedAeroTheme, recipePrimary } from "./recipe-edit.example.js";

// `node:fs` is deliberate: this is a documentation test over the tree's own
// page, and the tokens package ships zero runtime dependencies by design.
const markdown = readFileSync(
  new URL("../../../docs/tokens.md", import.meta.url),
  "utf8",
);

const preFixTheme = applyPlatformStyle(getTheme("dark"), {
  ...platformRecipes.aero,
  colors: {
    ...platformRecipes.aero.colors,
    dark: { ...platformRecipes.aero.colors.dark, primary: "#1F6FB5" },
  },
});

const markSurfaces = [
  "card",
  "hover",
  "input",
  "muted",
  "popover",
  "track",
] as const;

const ratioOf = (failure: ContrastFailure): string => failure.ratio.toFixed(3);

describe("documented recipe edit", () => {
  it("records the seven failures the one-role edit produced", () => {
    const failures = themeContrastFailures(preFixTheme);
    const label = failures.find(
      (failure) =>
        failure.foreground === "primaryForeground" &&
        failure.background === "primary",
    );
    expect(label?.pairClass).toBe("secondary");
    expect(label?.floor).toBe(contrastFloors.default.secondary);
    expect(label === undefined ? "" : ratioOf(label)).toBe("3.999");

    const marks = failures.filter(
      (failure) =>
        failure.foreground === "primary" && failure.pairClass === "mark",
    );
    expect(marks.map((failure) => failure.background).toSorted()).toEqual([
      ...markSurfaces,
    ]);
    expect(marks.map(ratioOf).toSorted()).toEqual([
      "2.233",
      "2.696",
      "2.696",
      "2.696",
      "2.696",
      "2.882",
    ]);
  });

  it("builds a theme the contract accepts", () => {
    expect(themeFailures(editedAeroTheme)).toEqual([]);
    expect(themeContrastFailures(editedAeroTheme)).toEqual([]);
  });

  it("moves the whole primary family", () => {
    expect(editedAeroTheme.colors).toMatchObject(recipePrimary);
    expect(editedAeroTheme.colors.primary).not.toBe(
      platformRecipes.aero.colors.dark.primary,
    );
    expect(editedAeroTheme.colors.primaryForeground).not.toBe(
      platformRecipes.aero.colors.dark.primaryForeground,
    );
  });

  it("keeps the edited fill's label and marks above their floors", () => {
    expect(
      contrastRatio(
        editedAeroTheme.colors.primaryForeground,
        editedAeroTheme.colors.primary,
      ),
    ).toBeGreaterThanOrEqual(contrastFloors.default.secondary);
    markSurfaces.forEach((surface) => {
      expect(
        contrastRatio(
          editedAeroTheme.colors.primary,
          editedAeroTheme.colors[surface],
        ),
        surface,
      ).toBeGreaterThanOrEqual(contrastFloors.default.mark);
    });
  });

  it("quotes the pre-fix figures and points at the executed example", () => {
    ["3.999", "2.696", "2.882", "2.233"].forEach((figure) => {
      expect(markdown, figure).toContain(figure);
    });
    expect(markdown).toContain("edit its values");
    expect(markdown).not.toContain("edit a value");
    expect(markdown).toContain("recipe-edit.example.ts");
  });

  it("leaves every shipped theme passing", () => {
    shippedThemes.forEach(({ theme }) => {
      expect(themeFailures(theme), theme.name).toEqual([]);
    });
  });
});
