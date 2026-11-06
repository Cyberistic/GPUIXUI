import { describe, expect, it } from "vitest";
import { colorRoles, type ThemeColors } from "./color.js";
import { contrastPairs } from "./contrast.js";
import { decorativeSurfaces } from "./decorative.js";
import { selectionPairs } from "./selection.js";

const measuredElsewhere = {
  selection: "selectionFailures",
} as const satisfies Partial<Record<keyof ThemeColors, string>>;

const measuredByTables = new Set<string>([
  ...contrastPairs.flatMap(({ foreground, background }) => [
    foreground,
    background,
  ]),
  ...selectionPairs.flatMap(({ foreground, background }) => [
    foreground,
    background,
  ]),
  ...decorativeSurfaces.flatMap(({ role, over }) => [role, over]),
]);

describe("colour coverage", () => {
  it("measures or names a contract for every role a theme carries", () => {
    const uncovered = colorRoles.filter(
      (role) => !measuredByTables.has(role) && !(role in measuredElsewhere),
    );

    expect(uncovered).toEqual([]);
  });

  it("drops an exemption once the tables measure the role", () => {
    const stale = Object.keys(measuredElsewhere).filter((role) =>
      measuredByTables.has(role),
    );

    expect(stale).toEqual([]);
  });

  it("names only roles the theme actually carries", () => {
    const unknown = Object.keys(measuredElsewhere).filter(
      (role) => !colorRoles.some((known) => known === role),
    );

    expect(unknown).toEqual([]);
  });
});
