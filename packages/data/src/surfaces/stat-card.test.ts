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

const statisticRow = readFileSync(
  new URL("../../../../.agents/slop/COMPONENTS.md", import.meta.url),
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
    expect(shippedStyles).toHaveLength(18);
    expect(trendCells).toHaveLength(72);
    expect(statisticRow).toBeDefined();

    const printed = (statisticRow ?? "").replaceAll("**", "");
    expect(printed).toContain(
      `${trendCells.length}-placement sweep over the ${shippedStyles.length} shipped`,
    );

    expect(printed).not.toContain("64-placement");
    expect(printed).not.toContain("sixteen");
  });

  it("would report the fill role it replaced as unreadable on a page", () => {
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

    expect(under.length).toBeGreaterThan(0);
  });
});
