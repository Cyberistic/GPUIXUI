/**
 * A statistic card's trend is **text on the card**, not a mark.
 *
 * The bug this guards: `trendTone` returned the solid `success`/`destructive`
 * fill roles, which the tokens contract measures at the 3:1 **mark** floor. A
 * trend's words are read, so they need the text floor — on the base light card
 * `success` is 4.54:1, on the same theme's page 4.26:1, and one authored light
 * look lands at 3.92:1, under the 4.5:1 floor while `auditTheme` passes. The
 * trend takes `statusTone(...).foreground`, which the contrast table already
 * holds to the body floor on `card` and `background`.
 */

import {
  contrastFloorsFor,
  contrastRatio,
  darkTheme,
  highContrastThemes,
  lightTheme,
  platformNames,
  platformTheme,
  retroNames,
  retroTheme,
  statusTone,
  themes,
} from "@gpuixui/tokens";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { trendTone } from "./stat-card.js";

/** Every shipped, high-contrast, platform and authored style. */
const shippedStyles = [
  ...Object.values(themes),
  ...Object.values(highContrastThemes),
  ...platformNames.flatMap((platform) =>
    Object.values(themes).map((theme) => platformTheme(theme, platform)),
  ),
  ...retroNames.flatMap((look) =>
    Object.values(themes).map((theme) => retroTheme(theme, look)),
  ),
] as const;

/** The cells the sweep measures: both directions, on both card surfaces. */
const trendCells = shippedStyles.flatMap((theme) => {
  const floor = contrastFloorsFor(theme).body;
  return (["up", "down"] as const).flatMap((direction) => [
    {
      theme: theme.name,
      direction,
      surface: "card" as const,
      ratio: contrastRatio(trendTone(direction, theme), theme.colors.card),
      floor,
    },
    {
      theme: theme.name,
      direction,
      surface: "background" as const,
      ratio: contrastRatio(
        trendTone(direction, theme),
        theme.colors.background,
      ),
      floor,
    },
  ]);
});

/** The Tier 3 row that owns the sweep. */
const statisticRow = readFileSync(
  new URL("../../../../COMPONENTS.md", import.meta.url),
  "utf8",
)
  .split("\n")
  .find((line) => line.startsWith("| Statistic / metric cards |"));

describe("trendTone", () => {
  it("asks the status tone for its readable role, not its fill", () => {
    expect(trendTone("up", lightTheme)).toBe(
      statusTone(lightTheme, "success").foreground,
    );
    expect(trendTone("down", darkTheme)).toBe(
      statusTone(darkTheme, "destructive").foreground,
    );
    // The retracted painter: a solid fill role is a mark, not a label.
    expect(trendTone("up", lightTheme)).not.toBe(lightTheme.colors.success);
    expect(trendTone("down", lightTheme)).not.toBe(
      lightTheme.colors.destructive,
    );
    expect(trendTone("flat", lightTheme)).toBe(
      lightTheme.colors.mutedForeground,
    );
  });

  it("clears the text floor on both surfaces a card stands on", () => {
    const under = trendCells.filter(
      (cell) => cell.ratio === undefined || cell.ratio < cell.floor,
    );
    expect(under).toEqual([]);
  });

  it("prints the sweep it measures on the card's row", () => {
    // The row outlived Omarchy's two styles: it still claimed a 64-placement
    // sweep over sixteen, while the suite walks eighteen styles and four cells
    // each. A reader plans the contract by that number, so derive it.
    expect(shippedStyles).toHaveLength(18);
    expect(trendCells).toHaveLength(72);
    expect(statisticRow).toBeDefined();
    // The row emphasises its figures; the claim is the numbers it prints.
    const printed = (statisticRow ?? "").replaceAll("**", "");
    expect(printed).toContain(
      `${trendCells.length}-placement sweep over the ${shippedStyles.length} shipped`,
    );
    // The retracted pair, refused where the row is the only thing printing it.
    expect(printed).not.toContain("64-placement");
    expect(printed).not.toContain("sixteen");
  });

  it("would report the fill role it replaced as unreadable on a page", () => {
    // The measured premise: a solid role can pass as a card fill and fail on
    // the page, so a suite that only reads one surface cannot hold this.
    const under = shippedStyles.flatMap((theme) => {
      const floor = contrastFloorsFor(theme).body;
      return (["success", "destructive"] as const).flatMap((tone) => {
        const ratio = contrastRatio(
          theme.colors[tone],
          theme.colors.background,
        );
        return ratio !== undefined && ratio < floor
          ? [{ theme: theme.name, tone, ratio, floor }]
          : [];
      });
    });

    // A premise, not a bug: if every palette became readable the case for the
    // text role would still hold, but this suite's negative control would not.
    expect(under.length).toBeGreaterThan(0);
  });
});
