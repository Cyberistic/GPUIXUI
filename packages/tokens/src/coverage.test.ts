/**
 * Holds the colour contract to its own scope: every role a theme carries is
 * measured by at least one contract.
 *
 * The bug this guards: `disabled`/`disabledForeground` and `scrollbar` were
 * shipped, documented and painted by components, and **no** contract measured
 * any of them — a palette edit could have made the unavailable label or the
 * scrollbar thumb invisible and the whole suite would have stayed green. The
 * role list is the inventory of what a theme carries, so a role added to
 * `ThemeColors` fails here until it is measured somewhere (or named in
 * `measuredElsewhere` with the contract that covers it).
 */

import { describe, expect, it } from "vitest";
import { colorRoles, type ThemeColors } from "./color.js";
import { contrastPairs } from "./contrast.js";
import { decorativeSurfaces } from "./decorative.js";
import { selectionPairs } from "./selection.js";

/**
 * The roles a dedicated contract measures instead of a pair or a surface.
 *
 * Both are values whose effect is not a flat colour on a surface, so the pair
 * tables would overstate what a reader sees; each names the contract that does
 * measure it.
 */
const measuredElsewhere = {
  selection: "selectionFailures",
  shadow: "elevationWithTint",
} as const satisfies Partial<Record<keyof ThemeColors, string>>;

/** Every role the pair and surface tables mention, on either side. */
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
    // An exemption that stopped being needed is a stale claim: the role is
    // measured twice and the "instead" sends a reader to the wrong contract.
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
