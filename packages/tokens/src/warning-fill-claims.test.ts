/**
 * Bug guarded: the light `warning` fill's fill-only rationale rests on one
 * measurement — `1.78:1` against the canvas, under the `3:1` mark floor — and
 * that is why `warning` and `info` carry no mark pair and a status label, icon
 * or dot reads `xText`.
 *
 * `docs.test.ts` derives the two sentences that argue it (the catalogue's
 * §*Status tones* paragraph and the design system's §3). The same figure is
 * restated in twelve further passages — the catalogue's two other statements,
 * the design system's mark-floor paragraph, the package README, the ledger and
 * four public source modules whose JSDoc a consumer reads — and nothing owned
 * them: replacing all twelve with `1.79` left 220 files / 7130 tests green, so a
 * palette edit could pass the two guarded cases and leave twelve documents
 * arguing from a number the package no longer produces.
 *
 * `node:fs` is deliberate, like `platform-claims.test.ts`: this is a
 * documentation test over the package's own prose and the pages beside it, and
 * the tokens package ships zero runtime dependencies.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastFloors, contrastRatio } from "./contrast.js";
import { extendTheme, getTheme } from "./theme.js";

/**
 * The seven files that state the light `warning` fill's canvas figure, and how
 * many passages each holds. The count is the guard: a file that gains a passage
 * fails here until the new statement is recorded, and a file that loses one
 * fails until its claim is.
 */
const passages = [
  ["../../../docs/tokens.md", 3],
  ["../../../docs/design-system.md", 2],
  ["../README.md", 1],
  ["../../../COMPONENTS.md", 1],
  ["./color.ts", 1],
  ["./contrast.ts", 3],
  ["./styles.ts", 3],
] as const;

const prose = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8").replace(/\s+/g, " ");

/**
 * Every passage that states the fill's contrast with the canvas: `light
 * \`warning\`` — either capitalisation — followed by the figure, up to a
 * sentence break. The high-contrast `warning` *soft surface* is another role and
 * another claim (`light \`warning\` edge measured 1.12:1`), so a phrase preceded
 * by `high-contrast ` is excluded.
 */
const stated = (text: string): ReadonlyArray<string> =>
  [
    ...text.matchAll(
      /(?<!high-contrast )[Ll]ight `warning`[^.;]*?(\d+\.\d\d):1/g,
    ),
  ].flatMap((match) => (match[1] === undefined ? [] : [match[1]]));

const fixed = (value: number): string => value.toFixed(2);

const light = getTheme("light");

describe("the light warning fill's canvas figure", () => {
  it("derives the fill-only premise from the shipped palette", () => {
    const { colors } = light;
    const canvas = fixed(contrastRatio(colors.warning, colors.background));
    const card = fixed(contrastRatio(colors.warning, colors.card));
    const success = fixed(contrastRatio(colors.success, colors.background));

    expect([canvas, card, success]).toEqual(["1.78", "1.89", "4.26"]);
    expect(Number(canvas)).toBeLessThan(contrastFloors.default.mark);
    expect(Number(card)).toBeLessThan(contrastFloors.default.mark);
    expect(Number(success)).toBeGreaterThanOrEqual(contrastFloors.default.mark);
    expect(Number(success)).toBeLessThan(contrastFloors.default.secondary);
  });

  it("holds every passage that states the figure", () => {
    const canvas = fixed(
      contrastRatio(light.colors.warning, light.colors.background),
    );

    passages.forEach(([file, count]) => {
      const found = stated(prose(file));
      expect(
        found,
        `${file} states the figure ${found.length} times`,
      ).toHaveLength(count);
      found.forEach((figure) => expect(figure, file).toBe(canvas));
    });
  });

  it("reads the pages instead of a constant", () => {
    const shipped = prose("../../../docs/tokens.md");
    expect(stated(shipped)).toContain("1.78");

    const rewritten = shipped.replaceAll(
      /([Ll]ight `warning`[^.;]*?)1\.78:1/g,
      "$11.79:1",
    );
    expect(stated(rewritten)).toContain("1.79");
    expect(stated(rewritten)).not.toContain("1.78");

    // The high-contrast soft surface is a different role: its mixture must never
    // be counted as this fill's figure.
    expect(
      stated(
        "the 30% mixture it replaced measured 1.12:1 on the high-contrast light `warning` surface, under the 3:1 that theme requires.",
      ),
    ).toEqual([]);
  });

  it("shows the premise can fail on a palette that crosses the floor", () => {
    const canvas = fixed(
      contrastRatio(light.colors.warning, light.colors.background),
    );

    const erased = extendTheme(light, {
      colors: { warning: light.colors.background },
    });
    expect(
      fixed(contrastRatio(erased.colors.warning, erased.colors.background)),
    ).not.toBe(canvas);

    const lifted = extendTheme(light, { colors: { warning: "#6B4500" } });
    expect(
      Number(
        fixed(contrastRatio(lifted.colors.warning, lifted.colors.background)),
      ),
    ).toBeGreaterThanOrEqual(contrastFloors.default.mark);
  });
});
