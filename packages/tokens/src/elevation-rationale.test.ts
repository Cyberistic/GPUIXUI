/**
 * Guards `highContrastDarkElevation`'s rationale.
 *
 * The JSDoc above the set is the copy-and-own rationale: it explains why the
 * AAA dark set paints with a light tint by quoting the counterfactual — the
 * identity dark tint at the identity's alphas over the pre-505 surfaces — and
 * by naming the two constraints the set keeps. No suite read it. Bumping the
 * card figure from 1.030 to 1.031 left the suite green (plan 505's own text
 * uses 1.031, so the tree disagreed with itself), setting the set's alphas to
 * the identity's returned no failure from any check, and so did moving one
 * level's geometry.
 *
 * The composition below is written out, not read from the shipped themes: it is
 * a historical claim about the tree before plan 505, so a future edit to the AAA
 * card must not move a figure about a set that no longer exists (plans 785 and
 * 798-800 write out their pre-fix fills for the same reason).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  darkElevation,
  elevationLevels,
  highContrastDarkElevation,
  type ElevationLevel,
  type ElevationShape,
} from "./elevation.js";
import {
  alpha,
  compositeOver,
  contrastRatio,
  getTheme,
  themes,
} from "./index.js";

/**
 * A source file as one line: the JSDoc's ` * ` prefixes and its wrapping are
 * removed, so a wrapped claim is never a substring gap. `**bold**` survives,
 * which is how the figures are printed.
 */
const prose = (url: URL): string =>
  readFileSync(url, "utf8")
    .replaceAll(/^[ \t]*\*(?!\*)[ \t]?/gm, "")
    .replaceAll(/\s+/g, " ");

const source = prose(new URL("./elevation.ts", import.meta.url));
const header = prose(new URL("./elevation-contrast.test.ts", import.meta.url));
const catalogue = prose(new URL("../../../docs/tokens.md", import.meta.url));

/**
 * The pre-505 AAA dark palette: the canvas and the card the counterfactual
 * paints on. Written out so a palette edit cannot move a historical figure.
 */
const preFixCanvas = "#000000";
const preFixCard = "#0D0D0D";

/** The levels the runtime paints; the reserved `overlay` is empty. */
const levels = elevationLevels.filter((level) => level !== "overlay");

const alphaOf = (
  elevation: typeof darkElevation,
  level: ElevationLevel,
): number => elevation[level][0]?.alpha ?? Number.NaN;

/** The identity dark tint at the identity's own alpha, over a pre-505 surface. */
const blackOn = (surface: string, level: ElevationLevel): number =>
  contrastRatio(
    compositeOver(
      alpha(themes.dark.colors.shadow, alphaOf(themes.dark.elevation, level)),
      surface,
    ),
    surface,
  );

const tightestOn = (surface: string): ElevationLevel =>
  levels.reduce((tightest, level) =>
    blackOn(surface, level) < blackOn(surface, tightest) ? level : tightest,
  );

const percentages = (elevation: typeof darkElevation): ReadonlyArray<number> =>
  levels.map((level) => Math.round(alphaOf(elevation, level) * 100));

/** The list as a sentence states it: `10, 14 and 18%`. */
const statedAlphas = (elevation: typeof darkElevation): string => {
  const values = percentages(elevation);
  return `${values.slice(0, -1).join(", ")} and ${values.at(-1)}%`;
};

const geometry = (shape: ElevationShape): ReadonlyArray<number> => [
  shape.offsetX,
  shape.offsetY,
  shape.blurRadius,
  shape.spreadRadius,
];

describe("the AAA dark elevation rationale", () => {
  it("states the counterfactual's canvas figure at every level", () => {
    const figures = levels.map((level) =>
      blackOn(preFixCanvas, level).toFixed(3),
    );

    expect(figures).toEqual(levels.map(() => "1.000"));
    expect(source).toContain(
      `**${figures[0]}:1** on the canvas at every level`,
    );
    expect(header).toContain(
      `**${figures[0]}:1** on the canvas at every level`,
    );
  });

  it("states the card figure and the level it is the tightest of", () => {
    const figures = levels.map((level) => blackOn(preFixCard, level));
    const tightest = tightestOn(preFixCard);
    const figure = blackOn(preFixCard, tightest).toFixed(3);

    expect(figures.map((ratio) => ratio.toFixed(3))).toEqual([
      "1.030",
      "1.049",
      "1.061",
    ]);
    expect(tightest).toBe("sm");
    expect(figure).toBe("1.030");
    expect(source).toContain(`**${figure}:1** at the tightest on the card`);
    expect(catalogue).toContain(`**${figure}:1** at the tightest on the card`);
    expect(header).toContain(`(${figure}:1 at the tightest on the card)`);
  });

  it("names the level the card figure belongs to", () => {
    const identity = percentages(darkElevation);

    expect(identity[0]).toBe(40);
    expect(source).toContain(
      `the small level at the identity's own ${identity[0]}%`,
    );
    expect(tightestOn(preFixCard)).toBe(levels[0]);
  });

  it("paints the light tint the AAA scrim also chooses", () => {
    const aaa = getTheme("dark", "high");
    const channel = (color: string): string => color.slice(0, 7).toUpperCase();

    expect(aaa.colors.shadow).toBe("#FFFFFF");
    expect(aaa.colors.overlay).toBe("#FFFFFF26");
    expect(channel(aaa.colors.overlay)).toBe(channel(aaa.colors.shadow));
    expect(channel(themes.dark.colors.shadow)).not.toBe(
      channel(aaa.colors.shadow),
    );
    expect(source).toContain("paints with the light tint instead");
    expect(source).toContain("the same choice the AAA scrim makes (plan 099)");
  });

  it("keeps alphas of its own, and states them", () => {
    const own = percentages(highContrastDarkElevation);
    const identity = percentages(darkElevation);

    levels.forEach((level) => {
      expect(alphaOf(highContrastDarkElevation, level), level).not.toBe(
        alphaOf(darkElevation, level),
      );
    });
    expect(own).not.toEqual(identity);
    expect(source).toContain(
      `its alphas are its own (${statedAlphas(highContrastDarkElevation)})`,
    );
  });

  it("keeps the identity dark geometry at every level", () => {
    elevationLevels.forEach((level) => {
      expect(highContrastDarkElevation[level].map(geometry), level).toEqual(
        darkElevation[level].map(geometry),
      );
    });
    expect(source).toContain("The geometry is the identity dark set's");
    expect(source).toContain("`elevation-rationale.test.ts`");
  });
});
