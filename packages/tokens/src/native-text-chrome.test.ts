/**
 * Guards the defect plan 592 fixes: the pinned runtime paints a diff's meta
 * line at 10.5px, its gutter, hunk header, notice and file counts at 11px and
 * its file path at 12px, each on GPUI's golden-ratio line box, but
 * `nativeTextTheme` derived every box from the theme's own type and spacing. A
 * compact theme that passes all nine checks (`caption`/`label`/`codeBlock` at
 * 8/8, spacing at 0) therefore resolved an 8px diff line, an 8px file header,
 * an 8px hunk header, an 8px notice and a 0px marker column, and the runtime
 * painted 11–12px text and an 11px gutter through them.
 *
 * This file fails without the floors in `metricsOf` (the compact metrics are
 * 8/8/8/8/0) and without the public chrome constants (the figures cannot be
 * derived).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  extendTheme,
  getTheme,
  nativeTextChrome,
  nativeTextLineRatio,
  nativeTextTheme,
  shippedThemes,
  themeFailures,
  type Spacing,
} from "./index.js";

/** The rounded line box GPUI gives a fixed chrome size. */
const chromeLine = (size: number): number =>
  Math.round(size * nativeTextLineRatio);

/** A valid compact theme: 8px caption/label/code and no spacing. */
const zeroSpacing: Spacing = {
  "2xs": 0,
  xs: 0,
  sm: 0,
  md: 0,
  lg: 0,
  xl: 0,
  "2xl": 0,
  "3xl": 0,
  "4xl": 0,
  "5xl": 0,
};

const compact = extendTheme(getTheme("light"), {
  typography: {
    caption: { fontSize: 8, lineHeight: 8 },
    label: { fontSize: 8, lineHeight: 8 },
    codeBlock: { fontSize: 8, lineHeight: 8 },
  },
  spacing: zeroSpacing,
  iconSize: { xs: 6, sm: 8 },
});

const authored = (theme: ReturnType<typeof getTheme>) => ({
  diffLineHeight: theme.typography.codeBlock.lineHeight,
  diffFileHeaderHeight:
    theme.typography.label.lineHeight + 2 * theme.spacing.md,
  diffHunkHeaderHeight:
    theme.typography.caption.lineHeight + 2 * theme.spacing.xs,
  diffNoticeHeight:
    theme.typography.caption.lineHeight + 2 * theme.spacing["2xs"],
  diffMarkerWidth: theme.spacing["2xl"],
});

describe("the native diff chrome fits the type the runtime paints", () => {
  it("shows the compact theme is valid and every authored box clips", () => {
    expect(themeFailures(compact)).toEqual([]);

    expect(authored(compact)).toEqual({
      diffLineHeight: 8,
      diffFileHeaderHeight: 8,
      diffHunkHeaderHeight: 8,
      diffNoticeHeight: 8,
      diffMarkerWidth: 0,
    });

    expect(chromeLine(nativeTextChrome.metaText)).toBe(17);
    expect(chromeLine(nativeTextChrome.chromeText)).toBe(18);
    expect(chromeLine(nativeTextChrome.filePathText)).toBe(19);
  });

  it("resolves the compact boxes to the runtime's line boxes", () => {
    const { metrics } = nativeTextTheme(compact);

    expect(metrics.diffLineHeight).toBe(
      chromeLine(nativeTextChrome.chromeText),
    );
    expect(metrics.diffFileHeaderHeight).toBe(
      chromeLine(nativeTextChrome.filePathText),
    );
    expect(metrics.diffHunkHeaderHeight).toBe(
      chromeLine(nativeTextChrome.chromeText),
    );
    expect(metrics.diffNoticeHeight).toBe(
      chromeLine(nativeTextChrome.chromeText),
    );
    expect(metrics.diffMarkerWidth).toBe(metrics.diffTextSize);
    expect(metrics.diffMarkerWidth).toBe(compact.typography.codeBlock.fontSize);
  });

  it("keeps every shipped box at the value it authored", () => {
    shippedThemes.forEach(({ theme }) => {
      const { metrics } = nativeTextTheme(theme);
      const boxes = authored(theme);

      expect(metrics.diffLineHeight, theme.name).toBe(
        Math.max(boxes.diffLineHeight, chromeLine(nativeTextChrome.chromeText)),
      );
      expect(metrics.diffFileHeaderHeight, theme.name).toBe(
        Math.max(
          boxes.diffFileHeaderHeight,
          chromeLine(nativeTextChrome.filePathText),
        ),
      );
      expect(metrics.diffHunkHeaderHeight, theme.name).toBe(
        Math.max(
          boxes.diffHunkHeaderHeight,
          chromeLine(nativeTextChrome.chromeText),
        ),
      );
      expect(metrics.diffNoticeHeight, theme.name).toBe(
        Math.max(
          boxes.diffNoticeHeight,
          chromeLine(nativeTextChrome.chromeText),
        ),
      );
      expect(metrics.diffMarkerWidth, theme.name).toBe(
        Math.max(boxes.diffMarkerWidth, theme.typography.codeBlock.fontSize),
      );

      // No shipped set is floored: every value moves only for a tighter theme.
      expect(boxes.diffLineHeight, theme.name).toBeGreaterThanOrEqual(
        chromeLine(nativeTextChrome.chromeText),
      );
      expect(boxes.diffFileHeaderHeight, theme.name).toBeGreaterThanOrEqual(
        chromeLine(nativeTextChrome.filePathText),
      );
      expect(boxes.diffHunkHeaderHeight, theme.name).toBeGreaterThanOrEqual(
        chromeLine(nativeTextChrome.chromeText),
      );
      expect(boxes.diffNoticeHeight, theme.name).toBeGreaterThanOrEqual(
        chromeLine(nativeTextChrome.chromeText),
      );
      expect(boxes.diffMarkerWidth, theme.name).toBeGreaterThanOrEqual(
        theme.typography.codeBlock.fontSize,
      );
    });
  });

  it("names the fixed chrome and the floors in the documents", () => {
    const markdown = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    );
    const readme = readFileSync(
      new URL("../README.md", import.meta.url),
      "utf8",
    );
    const designSystem = readFileSync(
      new URL("../../../docs/design-system.md", import.meta.url),
      "utf8",
    );

    expect(markdown).toContain("`nativeTextChrome`");
    expect(markdown).toContain("`nativeTextLineRatio`");
    expect(markdown).toContain("10.5px");
    expect(markdown).toContain("11px");
    expect(markdown).toContain("12px");
    expect(markdown).toContain("19 / 18 / 18 / 18");
    expect(readme).toContain("`nativeTextChrome`");
    expect(readme).toContain("one code em");
    expect(designSystem).toContain("`nativeTextChrome`");
    expect(designSystem).toContain("19 / 18 / 18 / 18");
  });
});
