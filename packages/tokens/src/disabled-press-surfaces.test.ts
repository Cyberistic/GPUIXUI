/**
 * Bug guarded: plan 651 gave a chosen row a pressed fill, `selectedActive`, and
 * `selectionPressPairs` measures `disabledForeground` on it at the inactive
 * floor and `border` on it at the divider floor. Four prose surfaces still
 * stopped at the persistent washes — the design system's §8 `disabled` row, its
 * §9 inactive-label and decorative-divider rows, the catalogue's Verification
 * paragraph and the package README — and the same press added a fifth fill to
 * the selected row's label tier while the catalogue still counted four. The
 * tests could not see it: the `disabled` state row derived its surfaces from
 * `inactivePairs`/`selectionInactivePairs` only, the §9 rows were compared with
 * a hand-written string, and the tier counts were prose. This suite derives
 * each list from the pair lists the checker runs.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ThemeColors } from "./color.js";
import {
  contrastFloors,
  contrastPairs,
  contrastRatio,
  inactivePairs,
  inactiveSurfaces,
  selectionInactivePairs,
  selectionPressPairs,
} from "./contrast.js";
import { disabledRowStyle } from "./disabled-state.example.js";
import { shippedThemes } from "./shipped-themes.js";

const designSystem = readFileSync(
  new URL("../../../docs/design-system.md", import.meta.url),
  "utf8",
);
const catalogue = readFileSync(
  new URL("../../../docs/tokens.md", import.meta.url),
  "utf8",
).replace(/\s+/g, " ");
const readme = readFileSync(
  new URL("../README.md", import.meta.url),
  "utf8",
).replace(/\s+/g, " ");

/** One Markdown table row, by its leading label. */
const tableRow = (label: string): string => {
  const row = designSystem
    .split("\n")
    .find((line) => line.startsWith(`| ${label}`));
  if (row === undefined) {
    throw new Error(`docs/design-system.md has no row starting "${label}"`);
  }
  return row;
};

/**
 * The table names the four soft status fills and the four row washes as
 * groups; expand each to the roles the contract measures.
 */
const expand = (text: string): string =>
  text
    .replace(
      "the four soft status fills",
      "`infoSoft` `successSoft` `warningSoft` `destructiveSoft`",
    )
    .replace("the four row washes", "`hover` `active` `accent` `selected`");

/** The surfaces a row fails to name, once the grouped phrases expand. */
const missing = (
  label: string,
  surfaces: ReadonlyArray<string>,
): ReadonlyArray<string> => {
  const text = expand(tableRow(label));
  return surfaces.filter((surface) => !text.includes(`\`${surface}\``));
};

/** The surfaces a role is measured on, in pair order, deduplicated. */
const surfaceSet = (
  role: keyof ThemeColors,
): ReadonlyArray<keyof ThemeColors> =>
  contrastPairs
    .flatMap(([foreground, background]) =>
      foreground === role ? [background] : [],
    )
    .filter((surface, index, all) => all.indexOf(surface) === index);

/** The prose's spelling of a small count. */
const countWord = (count: number): string =>
  [
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
  ][count] ?? `${count}`;

describe("the pressed selected row in the documentation", () => {
  it("measures the two pairs the prose names", () => {
    expect(selectionPressPairs).toContainEqual([
      "disabledForeground",
      "selectedActive",
      "inactive",
    ]);
    expect(selectionPressPairs).toContainEqual([
      "border",
      "selectedActive",
      "divider",
    ]);
  });

  it("names every inactive-label surface in the §8 disabled row", () => {
    const surfaces = [
      ...new Set(
        [
          ...inactivePairs,
          ...selectionInactivePairs,
          ...selectionPressPairs.filter(
            ([role]) => role === "disabledForeground",
          ),
        ].map(([, background]) => background),
      ),
    ];
    expect(surfaces).toContain("selectedActive");
    expect(missing("disabled", surfaces)).toEqual([]);
  });

  it("names every inactive-label surface in the §9 floor row", () => {
    expect(missing("inactive label (", inactiveSurfaces)).toEqual([]);
    expect(tableRow("inactive label (")).toContain("`selectedActive`");
  });

  it("names every decorative divider surface in the §9 floor row", () => {
    const surfaces = [
      ...new Set(
        contrastPairs
          .filter(
            ([foreground, , pairClass]) =>
              foreground === "border" && pairClass === "divider",
          )
          .map(([, background]) => background),
      ),
    ];
    expect(surfaces).toContain("selected");
    expect(surfaces).toContain("selectedActive");
    expect(missing("decorative dividers (", surfaces)).toEqual([]);
  });

  it("names the pressed row for an unavailable label in both documents", () => {
    [catalogue, readme].forEach((prose) => {
      expect(prose).toContain("pressed `selectedActive`");
      expect(prose).not.toContain(
        "the four row washes and the four soft status fills",
      );
    });
  });

  it("derives every tier count in the catalogue", () => {
    const surfaceCount = (
      dimmer: keyof ThemeColors,
      brighter: keyof ThemeColors,
    ): number => {
      const brighterSurfaces = surfaceSet(brighter);
      return surfaceSet(dimmer).filter((surface) =>
        brighterSurfaces.includes(surface),
      ).length;
    };
    const rows = [
      ["mutedForeground", "foreground", "shared surfaces"],
      ["mutedForeground", "cardForeground", "`card` for `cardForeground`"],
      ["mutedForeground", "popoverForeground", "for `popoverForeground`"],
      ["inputForeground", "mutedForeground", "surfaces typed text"],
      ["disabledForeground", "mutedForeground", "for the inactive label"],
      ["placeholder", "mutedForeground", "for a hint and a caption"],
      [
        "disabledForeground",
        "softActionForeground",
        "for the disabled panel-action label",
      ],
      ["selectedForeground", "foreground", "for the selected row's label"],
    ] as const;

    rows.forEach(([dimmer, brighter, marker]) => {
      const count = surfaceCount(dimmer, brighter);
      expect(count, `${dimmer} / ${brighter}`).toBeGreaterThan(0);
      expect(catalogue, marker).toContain(`${countWord(count)} ${marker}`);
    });
  });

  it("counts the selected row's five label fills in both documents", () => {
    const shared = surfaceSet("selectedForeground").filter((surface) =>
      surfaceSet("foreground").includes(surface),
    );
    expect(shared).toHaveLength(5);
    shared.forEach((surface) =>
      expect(catalogue, surface).toContain(`\`${surface}\``),
    );
    expect(catalogue).toContain(
      `${countWord(shared.length)} for the selected row's label`,
    );
    expect(readme).toContain(`all ${countWord(shared.length)} fills it keeps`);
  });

  it("paints both chosen fills at the inactive floor (the example runs)", () => {
    shippedThemes.forEach(({ theme }) => {
      const fills = [
        { pressed: false, fill: theme.colors.selected },
        { pressed: true, fill: theme.colors.selectedActive },
      ];
      fills.forEach(({ pressed, fill }) => {
        const style = disabledRowStyle(theme, pressed);
        expect(style.backgroundColor).toBe(fill);
        expect(style.color).toBe(theme.colors.disabledForeground);
        expect(
          contrastRatio(style.color, style.backgroundColor),
        ).toBeGreaterThanOrEqual(contrastFloors[theme.contrast].inactive);
      });
    });
  });
});
