/**
 * Guards the gap plan 522 closes. `scale.ts` calls `avatarSize.xs` the inline
 * tier — "inline with a dense row" — and the shipped `ListItem` fixes a dense
 * row at `theme.density.rowHeight` with its leading slot documented for "an
 * avatar, an icon". The numeric contract held the avatar ladder positive,
 * ordered and round (`radius.full` covers the largest tier), but never compared
 * the inline mark with the row it leads. A theme whose whole ladder rose to
 * 40/44/48/52 returned `[]` from every check while a 40px mark could not fit
 * a 28px macOS or XP row: the row's height is fixed, so the mark paints outside
 * it (or is clipped) instead of sitting inside it. The rule reads the theme's
 * own row, so a roomier density keeps the allowance, and equality is legal
 * because the rule is "the mark fits the row". Only the inline tier is bounded:
 * `md` in a dense row is a composition decision, not a size error.
 */
import { describe, expect, it } from "vitest";
import {
  extendTheme,
  getTheme,
  themeColorFailures,
  themeContrastFailures,
  themeDirectionFailures,
  themeFailures,
  themeMetricFailures,
  themeTextTierFailures,
  themeTypefaceFailures,
  type MetricFailure,
} from "./index.js";
import {
  tallInlineAvatar,
  tallInlineAvatarFailures,
} from "./inline-avatar.example.js";
import { shippedThemes } from "./shipped-themes.js";

const atMost = (
  member: string,
  actual: number,
  bound: number,
): MetricFailure => ({
  group: "avatarSize",
  member,
  rule: "at-most",
  actual,
  bound,
});

describe("an inline avatar fits its dense row", () => {
  it("reports an inline avatar taller than a dense row", () => {
    expect(tallInlineAvatarFailures).toEqual([atMost("xs", 40, 32)]);
  });

  it("reads the theme's own row, not the shipped one", () => {
    const compact = extendTheme(getTheme("dark"), {
      density: "compact",
      avatarSize: { xs: 40, sm: 44, md: 48, lg: 52 },
    });

    expect(themeMetricFailures(compact)).toEqual([atMost("xs", 40, 28)]);
  });

  it("allows an avatar exactly the height of the row", () => {
    const fits = extendTheme(getTheme("light"), {
      density: "compact",
      avatarSize: { xs: 28, sm: 30, md: 32, lg: 40 },
    });
    expect(themeMetricFailures(fits)).toEqual([]);

    const oneOver = extendTheme(fits, { avatarSize: { xs: 29 } });
    expect(themeMetricFailures(oneOver)).toEqual([atMost("xs", 29, 28)]);
  });

  it("is invisible to the other checks", () => {
    expect(themeColorFailures(tallInlineAvatar)).toEqual([]);
    expect(themeTypefaceFailures(tallInlineAvatar)).toEqual([]);
    expect(themeContrastFailures(tallInlineAvatar)).toEqual([]);
    expect(themeTextTierFailures(tallInlineAvatar)).toEqual([]);
    expect(themeDirectionFailures(tallInlineAvatar)).toEqual([]);
    expect(themeFailures(tallInlineAvatar)).toEqual([
      { kind: "metric", ...atMost("xs", 40, 32) },
    ]);
  });

  it("passes every shipped set", () => {
    shippedThemes.forEach(({ theme }) => {
      expect(themeMetricFailures(theme), theme.name).toEqual([]);
    });
  });
});
