/**
 * Guards plan 576: Theming restated the platform difference as prose ("type
 * families and theme name"), so the page would keep that claim after the tokens
 * workstream ships a full platform style. These tests prove the table is derived
 * from the two themes — including a fixture that changes a group the shipped
 * styles do not touch today, and a rebuilt-but-equal theme that reference
 * equality would wrongly call changed.
 */

import { describe, expect, it } from "vitest";
import { extendTheme, platformTheme, themes } from "@gpuixui/tokens";
import { styleDiff, type StyleDiff } from "./platform-styles";

const byLabel = (diffs: ReadonlyArray<StyleDiff>, label: string) =>
  diffs.find((diff) => diff.label === label);

describe("styleDiff", () => {
  it("reports the shipped Windows difference and nothing else", () => {
    const base = platformTheme(themes.light, "default");
    const applied = platformTheme(base, "win32");
    const diffs = styleDiff(base, applied);

    expect(byLabel(diffs, "Typography")?.detail).toBe("mono · Consolas");
    [
      "Palette",
      "Spacing",
      "Radius",
      "Density",
      "Elevation",
      "Border widths",
      "Icon sizes",
    ].forEach((label) => {
      expect(byLabel(diffs, label)?.detail, label).toBe("same");
    });
  });

  it("sees a group the shipped style does not touch yet", () => {
    const applied = extendTheme(themes.light, {
      colors: { primary: "#123456" },
      density: "compact",
    });
    const diffs = styleDiff(themes.light, applied);

    expect(byLabel(diffs, "Palette")?.changed).toEqual(["primary"]);
    expect(byLabel(diffs, "Palette")?.detail).toBe("primary · #123456");
    expect(byLabel(diffs, "Density")?.changed.length).toBeGreaterThan(0);
  });

  it("compares plain data, not object identity", () => {
    const rebuilt = structuredClone(themes.light);
    const diffs = styleDiff(themes.light, rebuilt);

    expect(diffs.every((diff) => diff.detail === "same")).toBe(true);
  });
});
