/**
 * The bug this guards: `docs/tokens.md` §Inactive attributes the
 * `1.542:1` step from `disabledForeground` to `softActionForeground` to
 * **identity dark**, which measures `1.877:1`; `1.542:1` is the high-contrast
 * dark set's. Plan `537` corrected the same attribution on the §Text hierarchy
 * sentence and plan `392`/`510`/`520` moved the values, but this sentence — and
 * the design system's "staying 1.301:1 … and 1.168:1 … below secondary text" —
 * is read by no test: `1.301` appears in no suite at all, so a palette edit that
 * moves either role leaves both passages quoting a figure the package no longer
 * produces, and the wrong-set attribution survived the plan that fixed its twin.
 *
 * `node:fs` is deliberate: this is a documentation test over the tree's own
 * pages, and the package ships zero runtime dependencies by design.
 */

import { readFileSync } from "node:fs";
import { assert, describe, expect, it } from "vitest";
import {
  contrastRatio,
  extendTheme,
  getTheme,
  textTierSurfaces,
} from "./index.js";
import type { ThemeColors } from "./color.js";

/** A page read as prose: line wrapping is not part of the claim. */
const prose = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8").replace(/\s+/g, " ");

const slice = (text: string, start: string, end: string): string => {
  const from = text.indexOf(start);
  const to = text.indexOf(end, from);
  assert(from !== -1 && to !== -1, `no slice from ${JSON.stringify(start)}`);
  return text.slice(from, to);
};

/** The step from a dimmer role to a brighter one, as the hierarchy checks it. */
const step = (
  colors: ThemeColors,
  surface: keyof ThemeColors,
  dimmer: keyof ThemeColors,
  brighter: keyof ThemeColors,
): number =>
  contrastRatio(colors[brighter], colors[surface]) /
  contrastRatio(colors[dimmer], colors[surface]);

interface TierStep {
  readonly surface: keyof ThemeColors;
  readonly ratio: number;
}

/** The tightest step of one pair over the surfaces both roles are text on. */
const tightest = (
  colors: ThemeColors,
  dimmer: keyof ThemeColors,
  brighter: keyof ThemeColors,
): TierStep => {
  const shared = textTierSurfaces(dimmer).filter((surface) =>
    textTierSurfaces(brighter).includes(surface),
  );
  const steps = shared.map((surface) => ({
    surface,
    ratio: step(colors, surface, dimmer, brighter),
  }));
  const [first] = steps.toSorted((left, right) => left.ratio - right.ratio);
  assert(first !== undefined, `${dimmer} and ${brighter} share a surface`);
  return first;
};

const fixed = (value: number): string => value.toFixed(3);

/** A page names a figure and the set that produces it. */
const names = (text: string, figure: string, set: string): boolean =>
  text.includes(`${figure}:1 (${set})`);

const catalogueInactive = slice(
  prose("../../../docs/tokens.md"),
  "The values stay below `mutedForeground` by",
  "The parts are public too.",
);

const designInactive = slice(
  prose("../../../docs/design-system.md"),
  "`selectionInactivePairs` holds `disabledForeground` through the wash",
  "The same gap exists one role over.",
);

/** The sentence plan `537` corrected a twin of, before this plan. */
const preFix = "and 1.542:1 below `softActionForeground` (identity dark)";

describe("the disabled label's quoted tier figures", () => {
  it("derives the step below secondary text for both dark sets", () => {
    const dark = getTheme("dark");
    const high = getTheme("dark", "high");
    const identity = fixed(
      tightest(dark.colors, "disabledForeground", "mutedForeground").ratio,
    );
    const aaa = fixed(
      tightest(high.colors, "disabledForeground", "mutedForeground").ratio,
    );

    expect(identity).toBe("1.301");
    expect(aaa).toBe("1.168");
    [catalogueInactive, designInactive].forEach((passage) => {
      expect(passage).toContain(`1.301:1 (identity dark)`);
      expect(passage).toContain(`1.168:1 (AAA dark)`);
    });
  });

  it("attributes the panel action's step to the set that produces it", () => {
    const dark = getTheme("dark");
    const high = getTheme("dark", "high");
    const identity = fixed(
      tightest(dark.colors, "disabledForeground", "softActionForeground").ratio,
    );
    const aaa = fixed(
      tightest(high.colors, "disabledForeground", "softActionForeground").ratio,
    );

    expect(identity).toBe("1.877");
    expect(aaa).toBe("1.542");
    expect(catalogueInactive).toContain(
      `1.542:1 below \`softActionForeground\` (high-contrast dark, where identity dark measures ${identity}:1)`,
    );
    expect(catalogueInactive).not.toContain(preFix);
  });

  it("reads the page rather than a constant", () => {
    expect(names(catalogueInactive, "1.301", "identity dark")).toBe(true);
    expect(preFix).toContain("1.542:1");
    expect(preFix).toContain("(identity dark)");
    expect(
      names(
        catalogueInactive.replace("1.301:1", "1.302:1"),
        "1.301",
        "identity dark",
      ),
    ).toBe(false);
    expect(names(catalogueInactive, "1.542", "identity dark")).toBe(false);
  });

  it("moves the figures with the palette", () => {
    const dark = getTheme("dark");
    const erased = extendTheme(dark, {
      colors: { disabledForeground: dark.colors.mutedForeground },
    });

    expect(
      fixed(
        tightest(erased.colors, "disabledForeground", "mutedForeground").ratio,
      ),
    ).toBe("1.000");
  });
});
