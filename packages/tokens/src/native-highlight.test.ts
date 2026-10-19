/**
 * Guards the defect plan 573 fixes: the pinned runtime seeds a native text
 * document's find-highlight washes from the theme's `accent` at 30% (every
 * match) and 65% (the active match)
 * (`references/gpuix/packages/native/src/text/search.rs`), and
 * `nativeTextTheme` maps that field to `primaryText` — the accent's readable
 * ink. A 65% wash of an ink is a surface, not a highlight: body text measured
 * **2.81:1** in identity dark and **4.80:1** in identity light, and even the 30%
 * match wash measured **6.80:1** in identity dark, under the 7:1 body floor,
 * while every check returned `[]`. `nativeHighlight` returns the `selection`
 * role and the same RGB one step stronger, and `nativeHighlightPairs` holds
 * every matchable text role through both washes. This file fails without the
 * fix.
 *
 * Plan 581: the step was held on the shipped sets only. `nativeHighlightStep`
 * is an absolute alpha, so an edited `selection` at 98.8% alpha
 * (`#C9D6EAFC`) paints both washes the same pale blue — **1.0019:1** — while
 * every text pair passes and `themeHighlightFailures`/`themeFailures` returned
 * `[]`.
 * The check now publishes the step on the four surfaces `bg` may name.
 */
import { describe, expect, it } from "vitest";
// `node:fs` is deliberate, as in the other tree-local documentation guards: the
// tokens package ships zero runtime dependencies and has no Effect FileSystem
// to borrow.
import { readFileSync } from "node:fs";
import {
  alpha,
  compositeOver,
  contrastFloors,
  contrastRatio,
  extendTheme,
  getTheme,
  lightTheme,
  nativeHighlight,
  nativeHighlightPairs,
  nativeHighlightStep,
  nativeTextSurfaces,
  nativeTextTheme,
  themeContrastFailures,
  themeFailures,
  themeHighlightFailures,
  type ThemeColors,
} from "./index.js";
import {
  activeStep,
  darkFindBar,
  findBar,
} from "./native-highlight.example.js";
import { nativeInk } from "./native-ink.js";
import { shippedThemes } from "./shipped-themes.js";

const surfaces = nativeTextSurfaces;

const ownAlpha = (color: string): number => {
  const match = /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})$/.exec(color);
  const byte = match?.[1];
  return byte === undefined ? 1 : Number.parseInt(byte, 16) / 255;
};

const painted = (
  paint: string,
  surface: keyof ThemeColors,
  theme: ThemeColors,
) => compositeOver(paint, theme[surface]);

describe("the native find-highlight contract", () => {
  it("proves the runtime's accent default is the defect", () => {
    const theme = getTheme("dark");
    const accent = nativeTextTheme(theme).accent;
    expect(accent).toBe(theme.colors.primaryText);

    const match = painted(alpha(accent, 0.3), "card", theme.colors);
    const active = painted(alpha(accent, 0.65), "card", theme.colors);
    const floor = contrastFloors.default.body;

    expect(contrastRatio(theme.colors.foreground, match)).toBeLessThan(floor);
    expect(contrastRatio(theme.colors.foreground, active)).toBeLessThan(floor);
    // Even the weaker match wash is under the body floor in identity dark.
    expect(contrastRatio(theme.colors.foreground, match)).toBeCloseTo(6.798, 2);
  });

  it("returns the selection wash and one stronger step for the active match", () => {
    shippedThemes.forEach(({ theme }) => {
      const highlight = nativeHighlight(theme);
      expect(highlight.color, theme.name).toBe(theme.colors.selection);
      expect(highlight.activeColor, theme.name).toBe(
        alpha(
          theme.colors.selection,
          Math.min(1, ownAlpha(theme.colors.selection) + nativeHighlightStep),
        ),
      );
    });

    const opaque = extendTheme(lightTheme, {
      colors: { selection: "#123456" },
    });
    expect(nativeHighlight(opaque)).toEqual({
      color: "#123456",
      activeColor: "#123456FF",
    });
  });

  it("keeps every matchable role readable through both washes in every shipped theme", () => {
    shippedThemes.forEach(({ theme }) => {
      const floors = contrastFloors[theme.contrast];
      const highlight = nativeHighlight(theme);
      surfaces.forEach((surface) => {
        [highlight.color, highlight.activeColor].forEach((wash) => {
          nativeHighlightPairs.forEach(([role, pairSurface, pairClass]) => {
            if (pairSurface !== surface) {
              return;
            }
            expect(
              contrastRatio(
                theme.colors[role],
                painted(wash, surface, theme.colors),
              ),
              `${theme.name} ${role} on ${surface}`,
            ).toBeGreaterThanOrEqual(floors[pairClass]);
          });
          expect(
            contrastRatio(
              theme.colors.foreground,
              painted(wash, surface, theme.colors),
            ),
            `${theme.name} body on ${surface}`,
          ).toBeGreaterThanOrEqual(floors.body);
        });
      });
    });
  });

  it("reports an edited selection whose highlight is unreadable", () => {
    const planted = extendTheme(lightTheme, {
      colors: { selection: alpha(lightTheme.colors.selection, 0.95) },
    });
    const failure = themeHighlightFailures(planted).find(
      (item) => item.pairClass === "secondary" && item.wash === "active",
    );
    expect(failure).toBeDefined();
    expect(failure?.ratio).toBeLessThan(contrastFloors.default.secondary);
  });

  it("reports an active match that is not a step above the match", () => {
    const planted = extendTheme(lightTheme, {
      colors: { selection: "#C9D6EAFC" },
    });
    // Every text pair and the wash's own visibility pass: the old check could
    // not see that both washes paint the same colour.
    expect(themeContrastFailures(planted)).toEqual([]);

    const step = themeHighlightFailures(planted).find(
      (failure) => failure.pairClass === "step",
    );
    expect(step).toBeDefined();
    expect(step?.ratio).toBeCloseTo(1, 3);
    expect(step?.floor).toBe(contrastFloors.default.step);

    expect(
      themeFailures(planted).some(
        (failure) =>
          failure.kind === "highlight" && failure.pairClass === "step",
      ),
    ).toBe(true);
  });

  it("makes the active match a perceivable step above the match", () => {
    shippedThemes.forEach(({ theme }) => {
      const highlight = nativeHighlight(theme);
      surfaces.forEach((surface) => {
        const match = painted(highlight.color, surface, theme.colors);
        const active = painted(highlight.activeColor, surface, theme.colors);
        expect(
          contrastRatio(active, match),
          `${theme.name} ${surface}`,
        ).toBeGreaterThanOrEqual(contrastFloors.default.step);
      });
      expect(
        themeHighlightFailures(theme).some(
          (failure) => failure.pairClass === "step",
        ),
        theme.name,
      ).toBe(false);
    });
  });

  it("derives every figure the reference quotes", () => {
    const docs = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    );
    const themes = shippedThemes.map(({ theme }) => theme);
    type Base = (
      theme: (typeof themes)[number],
      surface: keyof (typeof themes)[number]["colors"],
    ) => string;
    const opaque: Base = (theme, surface) => theme.colors[surface];
    const inked: Base = (theme, surface) => nativeInk(theme, surface);
    const ratios = (
      paintOf: (theme: (typeof themes)[number]) => string,
      role: (name: string, surface: string) => boolean = () => true,
      baseOf: Base = opaque,
    ): ReadonlyArray<number> =>
      themes.flatMap((theme) =>
        nativeHighlightPairs
          .filter(([foreground, surface]) =>
            role(String(foreground), String(surface)),
          )
          .map(([foreground, surface]) =>
            contrastRatio(
              theme.colors[foreground],
              compositeOver(paintOf(theme), baseOf(theme, surface)),
            ),
          ),
      );
    const match = Math.min(...ratios((theme) => nativeHighlight(theme).color));
    const active = Math.min(
      ...ratios((theme) => nativeHighlight(theme).activeColor),
    );
    const paintedMatch = Math.min(
      ...ratios((theme) => nativeHighlight(theme).color, undefined, inked),
    );
    const paintedActive = Math.min(
      ...ratios(
        (theme) => nativeHighlight(theme).activeColor,
        undefined,
        inked,
      ),
    );
    const body = (
      paintOf: (theme: (typeof themes)[number]) => string,
      baseOf: Base = opaque,
    ) => Math.min(...ratios(paintOf, (role) => role === "foreground", baseOf));
    const step = (baseOf: Base = opaque) =>
      Math.min(
        ...themes.flatMap((theme) => {
          const highlight = nativeHighlight(theme);
          return surfaces.map((surface) =>
            contrastRatio(
              compositeOver(highlight.activeColor, baseOf(theme, surface)),
              compositeOver(highlight.color, baseOf(theme, surface)),
            ),
          );
        }),
      );
    const fromSurface = (baseOf: Base = opaque) =>
      Math.min(
        ...themes.flatMap((theme) =>
          surfaces.map((surface) =>
            contrastRatio(
              compositeOver(
                nativeHighlight(theme).activeColor,
                baseOf(theme, surface),
              ),
              baseOf(theme, surface),
            ),
          ),
        ),
      );
    const hover = Math.min(
      ...themes.flatMap((theme) =>
        surfaces.flatMap((surface) =>
          nativeHighlightPairs
            .filter(([, pairSurface]) => pairSurface === surface)
            .map(([foreground]) =>
              contrastRatio(theme.colors[foreground], theme.colors.hover),
            ),
        ),
      ),
    );
    const hoverVisible = Math.min(
      ...themes.flatMap((theme) =>
        surfaces.map((surface) =>
          contrastRatio(theme.colors.hover, theme.colors[surface]),
        ),
      ),
    );

    [
      match,
      active,
      body((theme) => nativeHighlight(theme).color),
      body((theme) => nativeHighlight(theme).activeColor),
      step(),
      fromSurface(),
      paintedMatch,
      paintedActive,
      body((theme) => nativeHighlight(theme).color, inked),
      body((theme) => nativeHighlight(theme).activeColor, inked),
      step(inked),
      fromSurface(inked),
      hover,
      hoverVisible,
    ].forEach((figure) => {
      expect(docs, figure.toFixed(3)).toContain(`${figure.toFixed(2)}:1`);
    });

    [
      "nativeHighlight",
      "nativeHighlightPairs",
      "nativeHighlightStep",
      "themeHighlightFailures",
      "HighlightFailure",
    ].forEach((name) =>
      expect(
        new RegExp(`(^|[^A-Za-z0-9_$])${name}(?![A-Za-z0-9_$])`).test(docs),
        name,
      ).toBe(true),
    );
  });

  it("runs the example", () => {
    expect(findBar.highlight.color).toBe(lightTheme.colors.selection);
    expect(darkFindBar.highlight.color).toBe(getTheme("dark").colors.selection);
    expect(activeStep).toBe(nativeHighlightStep);
  });
});
