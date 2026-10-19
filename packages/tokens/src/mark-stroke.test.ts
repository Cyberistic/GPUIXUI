/**
 * Guards the defect plan 643 fixes: the fixed marks the theme owns were only
 * held to `positive`, so `toastToneBarWidth: 0.1` (and the inbox's unread dot,
 * a carousel indicator, an avatar's presence dot) returned `[]` from every
 * check while painting a sub-hairline smear. The timeline marker already read
 * `borderWidth.thin` (plan 604); the other four now do too, a zero, negative or
 * non-finite mark keeps its single `positive` diagnostic, and every shipped set
 * is unchanged.
 */
import { describe, expect, it } from "vitest";
import { shippedThemes } from "./shipped-themes.js";
import { themeFailures, themeMetricFailures } from "./index.js";
import { extendTheme, getTheme } from "./theme.js";

const fixedMarks = [
  "toastToneBarWidth",
  "notificationUnreadDotSize",
  "carouselIndicatorSize",
  "avatarPresenceDotSize",
] as const;

describe("fixed marks hold the theme's hairline", () => {
  it("keeps every shipped mark at or above its own hairline", () => {
    shippedThemes.forEach(({ theme }) => {
      fixedMarks.forEach((member) => {
        expect(
          theme.dimensions[member],
          `${theme.name} ${member}`,
        ).toBeGreaterThanOrEqual(theme.borderWidth.thin);
      });
    });
  });

  it("reports a sub-hairline Toast tone bar", () => {
    const theme = extendTheme(getTheme("light"), {
      dimensions: { toastToneBarWidth: 0.5 },
    });
    expect(themeMetricFailures(theme)).toEqual([
      {
        group: "dimensions",
        member: "toastToneBarWidth",
        rule: "at-least",
        actual: 0.5,
        bound: theme.borderWidth.thin,
      },
    ]);
  });

  it("reports every fixed mark below the hairline", () => {
    fixedMarks.forEach((member) => {
      const theme = extendTheme(getTheme("dark"), {
        dimensions: { [member]: 0.5 },
      });
      expect(themeMetricFailures(theme), member).toEqual([
        {
          group: "dimensions",
          member,
          rule: "at-least",
          actual: 0.5,
          bound: theme.borderWidth.thin,
        },
      ]);
    });
  });

  it("leaves a zero mark to the positive rule alone", () => {
    const theme = extendTheme(getTheme("light"), {
      dimensions: { toastToneBarWidth: 0 },
    });
    expect(themeMetricFailures(theme)).toEqual([
      {
        group: "dimensions",
        member: "toastToneBarWidth",
        rule: "positive",
        actual: 0,
        bound: 0,
      },
    ]);
  });

  it("invents no bound for a borderless theme", () => {
    const theme = extendTheme(getTheme("light"), {
      borderWidth: { thin: 0 },
      dimensions: { toastToneBarWidth: 0.5 },
    });
    expect(themeMetricFailures(theme)).toEqual([]);
  });

  it("accepts a mark equal to the hairline", () => {
    const theme = extendTheme(getTheme("light"), {
      dimensions: { notificationUnreadDotSize: 1 },
    });
    expect(themeMetricFailures(theme)).toEqual([]);
  });

  it("composes the finding into the total check", () => {
    const theme = extendTheme(getTheme("light"), {
      dimensions: { carouselIndicatorSize: 0.5 },
    });
    expect(themeFailures(theme)).toContainEqual({
      kind: "metric",
      group: "dimensions",
      member: "carouselIndicatorSize",
      rule: "at-least",
      actual: 0.5,
      bound: theme.borderWidth.thin,
    });
  });
});
