/**
 * Guards the two rows that state `selectionStatusPairs`' shipped minimum.
 *
 * The list is plan `366`'s: the four status text roles through the composited
 * `selection` wash on the nine surfaces a selectable row's label is dragged
 * over. Its minimum is **4.891:1**, Light · Linux `infoText` on `active`, which
 * `docs/tokens.md` states in both the *Text selection* section and the
 * *Verification* narrative.
 *
 * Two present-tense rows disagreed with it, and no suite read either:
 *
 * - `COMPONENTS.md`'s Design tokens row quoted **4.827:1** (Aero light
 *   `successText` on `selected`), a pair plan `582` moved to `#0E5135`, which
 *   now measures **7.158:1**;
 * - `TODO.md`'s plan-366 row quoted **4.661:1** (XP light `infoText` on
 *   `active`), a pair plan `574` moved, which now measures **5.615:1**.
 *
 * `figures.ts` owns the figures the catalogue states, and neither row is an
 * entry, so every palette plan that moved a light platform ink left both rows
 * arguing from a number the package no longer produces — the class plans `536`,
 * `717`, `760`, `831` and `833` closed one document at a time. The conclusion
 * still stands: `xText` is the role for a status label in a selectable row, and
 * the wash is measured on it. Only the figures and the named pairs were wrong,
 * so this suite holds those, and derives every one from `shippedThemes` with
 * the checker's own composition.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  compositeOver,
  contrastRatio,
  selectionStatusPairs,
  type ContrastPair,
} from "./contrast.js";
import { getPlatformRecipeTheme } from "./platform-recipes.js";
import { shippedThemes } from "./shipped-themes.js";
import {
  extendTheme,
  getTheme,
  type Theme,
  type ThemeContrast,
} from "./theme.js";

/** A document read as one line, so a reflowed paragraph still matches. */
const prose = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8")
    .replaceAll(/\s+/g, " ")
    .trim();

const catalogue = prose("../../../docs/tokens.md");
const ledger = prose("../../../COMPONENTS.md");
const tasks = prose("../../../TODO.md");
const readme = prose("../README.md");

/** The wash the runtime inherits into a selected label. */
const washed = (theme: Theme, [role, on]: ContrastPair): number =>
  contrastRatio(
    theme.colors[role],
    compositeOver(theme.colors.selection, theme.colors[on]),
  );

/** One set's lowest pair in the list, with the pair it came from. */
const lowest = (theme: Theme): { pair: ContrastPair; ratio: number } =>
  selectionStatusPairs
    .map((pair) => ({ pair, ratio: washed(theme, pair) }))
    .reduce((best, row) => (row.ratio < best.ratio ? row : best));

/** The lowest row across one contrast level, with the set it belongs to. */
const minimum = (
  contrast: ThemeContrast,
): {
  name: string;
  pair: ContrastPair;
  ratio: number;
} =>
  shippedThemes
    .filter((entry) => entry.theme.contrast === contrast)
    .map((entry) => ({ name: entry.theme.name, ...lowest(entry.theme) }))
    .reduce((best, row) => (row.ratio < best.ratio ? row : best));

/** A ratio rendered at the precision the documents quote. */
const figure = (ratio: number): string => `${ratio.toFixed(3)}:1`;

const tightest = minimum("default");
const tightestHigh = minimum("high");

describe("the status label through a text selection", () => {
  it("derives the tightest default pair", () => {
    expect(tightest.ratio).toBeCloseTo(4.891, 3);
    expect(figure(tightest.ratio)).toBe("4.891:1");
    expect(tightest.name).toBe("Light · Linux");
    expect(tightest.pair).toEqual(["infoText", "active", "secondary"]);
  });

  it("derives the tightest high-contrast pair", () => {
    expect(tightestHigh.ratio).toBeCloseTo(7.37, 3);
    expect(figure(tightestHigh.ratio)).toBe("7.370:1");
    expect(tightestHigh.name).toBe("High contrast light");
    expect(tightestHigh.pair).toEqual(["warningText", "active", "secondary"]);
    expect(tightestHigh.ratio).toBeGreaterThan(tightest.ratio);
  });

  it("does not produce the figures the stale rows name", () => {
    const aeroLight = getPlatformRecipeTheme("aero", "light");
    const aeroInk = washed(aeroLight, ["successText", "selected", "secondary"]);
    const xpLight = getPlatformRecipeTheme("xp", "light");
    const xpInk = washed(xpLight, ["infoText", "active", "secondary"]);

    expect(aeroInk).toBeCloseTo(7.158, 3);
    expect(figure(aeroInk)).toBe("7.158:1");
    expect(xpInk).toBeCloseTo(5.615, 3);
    expect(figure(xpInk)).toBe("5.615:1");
    expect(aeroInk).toBeGreaterThan(tightest.ratio + 2);
    expect(xpInk).toBeGreaterThan(tightest.ratio);
  });

  it("reads the catalogue's two passages", () => {
    expect(
      catalogue.includes(
        `the tightest shipped pair is **${figure(tightest.ratio)}** (Linux light \`infoText\` on \`active\`)`,
      ),
    ).toBe(true);
    expect(
      catalogue.includes(
        `The tightest pair is **${figure(tightest.ratio)}** (Linux light \`infoText\` on \`active\`) and **${figure(tightestHigh.ratio)}** at AAA (identity light high \`warningText\` on \`active\`)`,
      ),
    ).toBe(true);
    expect(catalogue.includes("4.827:1 (Aero light")).toBe(false);
    expect(catalogue.includes("4.661:1 XP light")).toBe(false);
  });

  it("reads the ledger and the task list", () => {
    expect(
      ledger.includes(
        `the tightest pair is ${figure(tightest.ratio)} (Linux light \`infoText\` on \`active\`; ${figure(tightestHigh.ratio)} at AAA)`,
      ),
    ).toBe(true);
    expect(
      tasks.includes(
        `every shipped set passes (${figure(tightest.ratio)} Linux light \`infoText\` on \`active\`, ${figure(tightestHigh.ratio)} at AAA)`,
      ),
    ).toBe(true);
    expect(ledger.includes("4.827:1 (Aero light")).toBe(false);
    expect(tasks.includes("4.661:1 XP light")).toBe(false);
  });

  it("reads the AAA sentence the README states", () => {
    expect(
      readme.includes(
        `the AAA tightest is ${figure(tightestHigh.ratio)} (identity light high \`warningText\` on \`active\`)`,
      ),
    ).toBe(true);
  });

  it("can fail on a moved role", () => {
    const light = getTheme("light");
    const collapsed = extendTheme(light, {
      colors: {
        infoText: compositeOver(light.colors.selection, light.colors.active),
      },
    });

    expect(washed(collapsed, ["infoText", "active", "secondary"])).toBe(1);
    expect(lowest(collapsed).pair).toEqual(["infoText", "active", "secondary"]);
    expect(figure(lowest(collapsed).ratio)).toBe("1.000:1");
    expect(figure(lowest(collapsed).ratio)).not.toBe(figure(tightest.ratio));
  });
});
