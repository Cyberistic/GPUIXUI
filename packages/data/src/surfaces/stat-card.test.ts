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
    expect(trendTone("flat", lightTheme)).toBe(lightTheme.colors.mutedForeground);
  });

  it("clears the text floor on both surfaces a card stands on", () => {
    const cells = shippedStyles.flatMap((theme) => {
      const floor = contrastFloorsFor(theme).body;
      return (["up", "down"] as const).flatMap((direction) => [
        {
          theme: theme.name,
          direction,
          surface: "card",
          ratio: contrastRatio(trendTone(direction, theme), theme.colors.card),
          floor,
        },
        {
          theme: theme.name,
          direction,
          surface: "background",
          ratio: contrastRatio(
            trendTone(direction, theme),
            theme.colors.background,
          ),
          floor,
        },
      ]);
    });

    const under = cells.filter(
      (cell) => cell.ratio === undefined || cell.ratio < cell.floor,
    );
    expect(under).toEqual([]);
  });

  it("would report the fill role it replaced as unreadable on a page", () => {
    // The measured premise: a solid role can pass as a card fill and fail on
    // the page, so a suite that only reads one surface cannot hold this.
    const under = shippedStyles.flatMap((theme) => {
      const floor = contrastFloorsFor(theme).body;
      return (["success", "destructive"] as const).flatMap((tone) => {
        const ratio = contrastRatio(theme.colors[tone], theme.colors.background);
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
