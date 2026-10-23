/**
 * Holds the divider count the data lane prints to the styles it ships.
 *
 * The bug this guards: `COMPONENTS.md`'s Tier 3 `Tables` row and the table's own
 * JSDoc said the raw `border` role is under the 1.05:1 floor on **20 of the
 * 80** (the source said **17 of the 64**) wash placements, while the tokens
 * contract measures **22 of the 90** over the **eighteen** shipped,
 * high-contrast, platform and authored styles. The tokens package's own guard
 * could not catch the Tier 3 row: it asks whether the inventory contains the
 * phrase anywhere, and the `Decorative surfaces` row carries it, so a stale
 * table sentence stayed green behind a correct one.
 *
 * Every number here is derived from the token package's style table and its
 * divider contract — the styles, the washes, the derived presses and the floor
 * — so adding a style or a wash moves the count, and the row, the source and
 * both pages fail until they print what the contract now measures.
 *
 * `node:fs` is deliberate and test-only, the shape `readme.test.ts` and the
 * tokens package's own contracts use: this reads the repository's files from a
 * plain vitest suite, with no Effect runtime to provide a `FileSystem` to.
 */

import { readFileSync } from "node:fs";
import {
  contrastRatio,
  decorativeFloor,
  dividerOn,
  dividerPresses,
  dividerWashes,
  highContrastThemes,
  platformNames,
  platformTheme,
  pointerWash,
  retroNames,
  retroTheme,
  themes,
  type Theme,
} from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";

/** Read a file beside this suite, or the repository's own records above it. */
const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const inventory = read("../../../../COMPONENTS.md");
const table = read("./table.tsx");
const page = read("../../docs/table-selection.mdx");
const behaviour = read("../behaviour/table.test.tsx");

/** Every shipped, high-contrast, platform and authored style. */
const styles: ReadonlyArray<Theme> = [
  ...Object.values(themes),
  ...Object.values(highContrastThemes),
  ...platformNames.flatMap((platform) =>
    Object.values(themes).map((theme) => platformTheme(theme, platform)),
  ),
  ...retroNames.flatMap((look) =>
    Object.values(themes).map((theme) => retroTheme(theme, look)),
  ),
];

/** One surface a row's rule crosses: the role, and the fill painted there. */
const placements = styles.flatMap((theme) => [
  ...dividerWashes.map((wash) => ({
    surface: theme.colors[wash],
    theme,
  })),
  ...dividerPresses.map((replaced) => ({
    surface: pointerWash(theme, "active", replaced, decorativeFloor),
    theme,
  })),
]);

/** The placements the raw `border` role cannot be seen on. */
const missed = placements.filter(({ surface, theme }) => {
  const ratio = contrastRatio(theme.colors.border, surface);
  return ratio === undefined || ratio < decorativeFloor;
});

/** The placements `dividerOn` cannot answer, which must be none. */
const unanswerable = placements.filter(({ surface, theme }) => {
  const rule = dividerOn(theme, surface, decorativeFloor);
  const ratio = rule === undefined ? undefined : contrastRatio(rule, surface);
  return ratio === undefined || ratio < decorativeFloor;
});

/** The one inventory row that owns the table's rule. */
const tablesRow = inventory
  .split("\n")
  .find((line) => line.startsWith("| Tables |"));

describe("the divider count the data lane prints", () => {
  it("is the measurement over the styles the contract ships", () => {
    // Pinned, so a palette or a style edit moves this case before any page can
    // be updated to a number the contract no longer measures.
    expect(styles).toHaveLength(18);
    expect(placements).toHaveLength(90);
    expect(missed).toHaveLength(22);
    // The premise the helper rests on: `borderStrong` can answer every wash,
    // so a reported placement is a bent palette rather than an impossible one.
    expect(unanswerable).toEqual([]);
  });

  it("names the Tier 3 row and the painter, not any row that carries the phrase", () => {
    // The tokens guard's hole: the `Decorative surfaces` row carries the same
    // phrase, so a whole-file search passed while the table's row was stale.
    expect(tablesRow).toBeDefined();
    expect(tablesRow).toContain(`${missed.length} of the ${placements.length}`);
    expect(table).toContain(
      `${missed.length} of the ${placements.length} shipped wash placements`,
    );
  });

  it("prints the same count on the page that owns the rule", () => {
    expect(page).toContain(`**${missed.length} of the ${placements.length}**`);
    expect(behaviour).toContain(
      `${missed.length} of the ${placements.length} shipped`,
    );
  });

  it("keeps no retracted count in the lane's own records", () => {
    // The two numbers that shipped before the eighteen-style set: a rewrite of
    // one sentence must not leave its old count behind in another.
    const stale = ["20 of the 80", "17 of the 64"];
    [tablesRow ?? "", table, page, behaviour].forEach((record) =>
      stale.forEach((claim) => expect(record).not.toContain(claim)),
    );
  });
});
