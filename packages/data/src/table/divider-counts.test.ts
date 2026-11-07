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

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const inventory = read("../../../../.agents/slop/COMPONENTS.md");
const table = read("./table.tsx");
const page = read("../../docs/table-selection.mdx");
const behaviour = read("../behaviour/table.test.tsx");

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

const missed = placements.filter(({ surface, theme }) => {
  const ratio = contrastRatio(theme.colors.border, surface);
  return ratio === undefined || ratio < decorativeFloor;
});

const unanswerable = placements.filter(({ surface, theme }) => {
  const rule = dividerOn(theme, surface, decorativeFloor);
  const ratio = rule === undefined ? undefined : contrastRatio(rule, surface);
  return ratio === undefined || ratio < decorativeFloor;
});

const tablesRow = inventory
  .split("\n")
  .find((line) => line.startsWith("| Tables |"));

describe("the divider count the data lane prints", () => {
  it("is the measurement over the styles the contract ships", () => {
    expect(styles).toHaveLength(18);
    expect(placements).toHaveLength(90);
    expect(missed).toHaveLength(22);

    expect(unanswerable).toEqual([]);
  });

  it("names the Tier 3 row that carries the count", () => {
    expect(tablesRow).toBeDefined();
    expect(tablesRow).toContain(`${missed.length} of the ${placements.length}`);
  });

  it("keeps no retracted count in the lane's own records", () => {
    const stale = ["20 of the 80", "17 of the 64"];
    [tablesRow ?? "", table, page, behaviour].forEach((record) =>
      stale.forEach((claim) => expect(record).not.toContain(claim)),
    );
  });
});
