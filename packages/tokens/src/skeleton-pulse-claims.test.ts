/**
 * The bug this guards: the catalogue's loading paragraph says the pulse's dim
 * frame is tightest in identity dark and that "the next tightest is 1.072:1",
 * while the shipped enumeration's tightest is `Light · Windows XP` on its
 * `active` wash at **1.059:1** — tighter than the set the paragraph is about.
 * Plan `619` moved that wash one designed step so the selectable row's press
 * cleared its own floor, and plan `393`'s audit predates both that move and the
 * XP/Aero recipes joining `shippedThemes`, so the parenthetical quotes the
 * third-tightest frame and no set produces it. Nothing read either half:
 * `docs.test.ts` holds the paragraph's surface list and `skeleton-pulse.test.ts`
 * holds every shipped set to the floor, so a palette edit could leave the page
 * naming the wrong set and a figure the package no longer produces while every
 * gate stayed green.
 *
 * `node:fs` is deliberate: this is a documentation test over the tree's own
 * pages, and the package ships zero runtime dependencies by design.
 */

import { readFileSync } from "node:fs";
import { assert, describe, expect, it } from "vitest";
import {
  alpha,
  compositeOver,
  contrastRatio,
  extendTheme,
  getTheme,
  shippedThemes,
  skeletonPulseOpacity,
  skeletonPulsePairs,
} from "./index.js";
import type { ThemeColors } from "./color.js";

/** A page read as prose: line wrapping is not part of the claim. */
const prose = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8").replace(/\s+/g, " ");

/**
 * The loading paragraph, from the audit's evidence to the next section. A
 * moved paragraph fails with the slice's name rather than passing on "".
 */
const slice = (text: string, start: string, end: string): string => {
  const from = text.indexOf(start);
  const to = text.indexOf(end, from);
  assert(from !== -1 && to !== -1, `no slice from ${JSON.stringify(start)}`);
  return text.slice(from, to);
};

/** The role composited at the pulse's fraction over the surface behind it. */
const dimFrame = (color: string, surface: string): number =>
  contrastRatio(
    compositeOver(alpha(color, skeletonPulseOpacity), surface),
    surface,
  );

const fixed = (value: number): string => value.toFixed(3);

interface Frame {
  readonly theme: string;
  readonly surface: keyof ThemeColors;
  readonly ratio: number;
}

type NamedTheme = {
  readonly theme: { readonly name: string; readonly colors: ThemeColors };
};

/** Every dim frame in an enumeration of sets, tightest first. */
const framesOf = (themes: ReadonlyArray<NamedTheme>): ReadonlyArray<Frame> =>
  themes
    .flatMap(({ theme }) =>
      skeletonPulsePairs.map(([role, surface]) => ({
        theme: theme.name,
        surface,
        ratio: dimFrame(theme.colors[role], theme.colors[surface]),
      })),
    )
    .toSorted((left, right) => left.ratio - right.ratio);

const tightestFrame = (themes: ReadonlyArray<NamedTheme> = shippedThemes) => {
  const [first] = framesOf(themes);
  assert(first !== undefined, "the enumeration carries a dim frame");
  return first;
};

/** A page names the frame when it carries the set, the surface and the figure. */
const namesTightest = (text: string, frame: Frame): boolean =>
  text.includes(frame.theme) &&
  text.includes(`\`${frame.surface}\``) &&
  text.includes(`**${fixed(frame.ratio)}:1**`);

const catalogueLoading = slice(
  prose("../../../docs/tokens.md"),
  "The audit found identity dark at **1.008:1** on `selected`",
  "Brand-toned text is checked on the nine surfaces",
);

const readmeLoading = slice(
  prose("../README.md"),
  "identity dark measured **1.008:1** on `selected`",
  "and the decorative `border` at 1.05:1",
);

/** The sentence plan `393` wrote, before plan `821` corrected it. */
const preFix =
  "The other seven surfaces are wider, and every other shipped set already cleared 1.05:1 at 0.6 (the next tightest is 1.072:1), so no other value moves.";

describe("the loading pulse's quoted dim-frame figures", () => {
  it("derives the identity dark pair the paragraph uses for the move", () => {
    const dark = getTheme("dark");
    const dim = fixed(dimFrame(dark.colors.skeleton, dark.colors.selected));
    const opaque = fixed(
      contrastRatio(dark.colors.skeleton, dark.colors.selected),
    );

    expect(dim).toBe("1.074");
    expect(opaque).toBe("1.179");
    expect(catalogueLoading).toContain(`**${dim}:1**`);
    expect(catalogueLoading).toContain(`${opaque}:1`);
    expect(readmeLoading).toContain(`${dim}:1`);
  });

  it("orders every surface of that set behind the selected fill", () => {
    const dark = getTheme("dark");
    const sorted = skeletonPulsePairs
      .map(([role, surface]) => ({
        surface,
        ratio: dimFrame(dark.colors[role], dark.colors[surface]),
      }))
      .toSorted((left, right) => left.ratio - right.ratio);

    expect(sorted[0]?.surface).toBe("selected");
    // The list grew to nine surfaces when plan 322 added the `accent` wash.
    expect(sorted).toHaveLength(9);
    expect(catalogueLoading).toContain("The other eight surfaces in that set");
  });

  it("names the tightest set, surface and figure the package produces", () => {
    const tightest = tightestFrame();

    expect(tightest.theme).toBe("Light · Windows XP");
    expect(tightest.surface).toBe("active");
    expect(fixed(tightest.ratio)).toBe("1.059");
    expect(namesTightest(catalogueLoading, tightest)).toBe(true);
    expect(catalogueLoading).not.toContain("1.072:1");
  });

  it("reads the page rather than a constant", () => {
    const tightest = tightestFrame();

    expect(namesTightest(preFix, tightest)).toBe(false);
    expect(
      namesTightest(catalogueLoading.replace("1.059:1", "1.060:1"), tightest),
    ).toBe(false);
    expect(
      namesTightest(catalogueLoading, { ...tightest, theme: "Light · macOS" }),
    ).toBe(false);
  });

  it("moves the tightest set when the palette does", () => {
    const light = getTheme("light");
    const planted = extendTheme(light, {
      colors: { active: light.colors.skeleton },
    });
    const replaced = shippedThemes.map((entry) =>
      entry.theme.name === planted.name ? { ...entry, theme: planted } : entry,
    );
    const tightest = tightestFrame(replaced);

    expect(tightest.theme).not.toBe("Light · Windows XP");
    expect(namesTightest(catalogueLoading, tightest)).toBe(false);
  });
});
