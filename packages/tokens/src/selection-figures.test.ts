/**
 * The regression these cases guard: the selection contract's present-tense
 * minima were prose without an owner. Falsifying any of 8.14, 5.08, 5.69, 6.19,
 * 8.44, 8.98, 11.59, 6.22, 6.93, 4.801, 1.0695, 1.079, 1.109, 1.246, 1.254 or
 * 1.319 in `docs/tokens.md` (or the ledger's 1.109) left the package green,
 * because the hand-typed lists in `docs.test.ts`, `selection-status-panel.test.ts`,
 * `field-control-fill.test.ts` and `elevation-contrast.test.ts` derived some of
 * the values without owning the sentence around them.
 *
 * Three claims are scoped on purpose and must not be widened: the link's
 * "tightest shipped pair" is the two row fills plan 314 added, not the whole
 * at-rest list (Windows dark on `active` is lower); the elevation sentence's
 * 1.109 is the two surfaces plan 509 added, not the `sm` walk (identity dark on
 * `background` is lower); and `selectionPairs`' true minimum, 4.801, was stated
 * in no passage until plan 842.
 */
import { readFileSync } from "node:fs";
import { assert, describe, expect, it } from "vitest";
import {
  compositeOver,
  contrastRatio,
  elevationSurfaces,
  selectionPairs,
  selectionSurfaces,
  type ContrastPair,
} from "./contrast.js";
import { alpha } from "./color.js";
import type { Theme } from "./theme.js";
import { getPlatformTheme, getTheme, shippedThemes } from "./index.js";
import {
  documentedFigures,
  deriveFigure,
  quotesFigure,
  tightestProvenance,
  type DocumentedFigure,
} from "./figures.js";

const page = readFileSync(
  new URL("../../../docs/tokens.md", import.meta.url),
  "utf8",
);
const ledger = readFileSync(
  new URL("../../../COMPONENTS.md", import.meta.url),
  "utf8",
);

/** The sixteen catalogue entries this plan adds. */
const catalogueNames = [
  "the washed soft panel's tightest body",
  "the washed soft panel's tightest caption",
  "the link's tightest row fill",
  "the link's tightest soft fill",
  "the row title on the selected fill at rest",
  "the menu label on the selected fill at rest",
  "the menu label on the pressed row at rest",
  "the inherited label on the pressed row at rest",
  "the inherited label on the hovered row at rest",
  "the washed selection list's own minimum",
  "the interactive fill on the field's own fill",
  "the dialog's face on the scrim",
  "the two surfaces the elevation walk added",
  "the light warning edge on the macOS light pressed wash",
  "the light warning edge on the Linux light pressed wash",
  "the light warning edge on its own fill",
] as const;

const ledgerName = "the ledger's two added elevation surfaces";

const find = (name: string): DocumentedFigure => {
  const entry = documentedFigures.find((figure) => figure.name === name);
  assert(entry !== undefined, `${name} is in the table`);
  return entry;
};

const documentOf = (entry: DocumentedFigure): string =>
  entry.document === "COMPONENTS.md" ? ledger : page;

const derive = (entry: DocumentedFigure) => {
  const derived = deriveFigure(entry);
  assert(derived.kind === "derived", entry.name);
  return derived;
};

const minimum = (
  pairs: ReadonlyArray<ContrastPair>,
  measure: (theme: Theme, pair: ContrastPair) => number,
) =>
  shippedThemes
    .flatMap((shipped) =>
      pairs.map((pair) => ({
        shipped,
        pair,
        ratio: measure(shipped.theme, pair),
      })),
    )
    .reduce((best, current) => (current.ratio < best.ratio ? current : best));

describe("the selection contract's documented minima", () => {
  it("owns each figure once, in the document its sentence lives in", () => {
    [...catalogueNames, ledgerName].forEach((name) => {
      expect(
        documentedFigures.filter((entry) => entry.name === name),
        name,
      ).toHaveLength(1);
      expect(Number.isNaN(derive(find(name)).ratio), name).toBe(false);
    });
    expect(find(ledgerName).document).toBe("COMPONENTS.md");
    expect(find(ledgerName).pairs).toEqual(
      find("the two surfaces the elevation walk added").pairs,
    );
  });

  it("counts the figures the page states more than once", () => {
    const occurrences = (figure: string) =>
      page.split(figure).length - 1;

    expect(occurrences("8.14")).toBe(3);
    expect(occurrences("5.08")).toBe(3);
    expect(occurrences("1.079")).toBe(2);
  });

  it("scopes the link's tightest pair to the two row fills plan 314 added", () => {
    const entry = find("the link's tightest row fill");
    expect(entry.pairs.map(([, background]) => background)).toEqual([
      "accent",
      "selected",
    ]);
    expect(derive(entry).figure).toBe("5.69");

    const wholeList: DocumentedFigure = {
      ...entry,
      name: "the whole at-rest link list",
      pairs: selectionSurfaces.map(
        (surface): ContrastPair => ["primaryText", surface, "secondary"],
      ),
    };
    const weakest = derive({
      ...wholeList,
      provenance: tightestProvenance(wholeList),
    });

    expect(weakest.ratio).toBeLessThan(5.69);
    expect(weakest.provenance).toMatchObject({
      source: "platform",
      platform: "win32",
      mode: "dark",
    });
    expect(
      minimum(wholeList.pairs, (theme, [foreground, background]) =>
        contrastRatio(theme.colors[foreground], theme.colors[background]),
      ).pair[1],
    ).toBe("active");
  });

  it("scopes the elevation figure to the two surfaces plan 509 added", () => {
    const entry = find("the two surfaces the elevation walk added");
    expect(entry.pairs.map(([, background]) => background)).toEqual(
      elevationSurfaces.filter(
        (surface) => surface === "selected" || surface === "input",
      ),
    );
    expect(derive(entry).figure).toBe("1.109");

    const wholeWalk: DocumentedFigure = {
      ...entry,
      name: "the whole elevation walk",
      pairs: elevationSurfaces.map(
        (surface): ContrastPair => ["shadow", surface, "surface"],
      ),
    };
    const weakest = derive({
      ...wholeWalk,
      provenance: tightestProvenance(wholeWalk),
    });

    expect(weakest.ratio).toBeLessThan(1.109);
    expect(weakest.provenance).toMatchObject({
      source: "identity",
      mode: "dark",
    });
  });

  it("composes the dialog face with the scrim's own alpha", () => {
    const entry = find("the dialog's face on the scrim");
    expect(entry.composition).toEqual({
      opacity: 1,
      wash: { role: "overlay" },
    });

    const linuxDark = getPlatformTheme("linux", "dark", "default");
    const face = compositeOver(
      linuxDark.colors.overlay,
      linuxDark.colors.destructive,
    );
    expect(derive(entry).ratio).toBeCloseTo(
      contrastRatio(linuxDark.colors.popover, face),
      10,
    );
    // Painting the scrim opaque is a different face; the stored alpha is the
    // composition the catalogue describes.
    expect(derive(entry).ratio).not.toBeCloseTo(
      contrastRatio(
        linuxDark.colors.popover,
        alpha(linuxDark.colors.overlay, 1),
      ),
      3,
    );
  });

  it("reads a cross pair from one theme's role and the other's surface", () => {
    const identityLight = getTheme("light", "default");
    const cases = [
      ["the light warning edge on the macOS light pressed wash", "darwin", 1.246],
      ["the light warning edge on the Linux light pressed wash", "linux", 1.254],
    ] as const;

    cases.forEach(([name, platform, figure]) => {
      const entry = find(name);
      const against = getPlatformTheme(platform, "light", "default");

      expect(derive(entry).figure).toBe(figure.toFixed(3));
      expect(derive(entry).ratio).toBeCloseTo(
        contrastRatio(
          identityLight.colors.warningSoftBorder,
          against.colors.active,
        ),
        10,
      );
      expect(derive(entry).ratio).not.toBeCloseTo(
        contrastRatio(
          identityLight.colors.warningSoftBorder,
          identityLight.colors.active,
        ),
        3,
      );
    });
  });

  it("states the washed selection list's true minimum", () => {
    const entry = find("the washed selection list's own minimum");
    expect(entry.pairs).toBe(selectionPairs);
    expect(derive(entry).figure).toBe("4.801");

    const windowsDark = getPlatformTheme("win32", "dark", "default");
    expect(derive(entry).ratio).toBeCloseTo(
      contrastRatio(
        windowsDark.colors.mutedForeground,
        compositeOver(windowsDark.colors.selection, windowsDark.colors.selected),
      ),
      10,
    );

    const weakest = minimum(selectionPairs, (theme, [foreground, background]) =>
      contrastRatio(
        theme.colors[foreground],
        compositeOver(theme.colors.selection, theme.colors[background]),
      ),
    );
    expect(weakest.ratio.toFixed(3)).toBe("4.801");
    expect([weakest.pair[0], weakest.pair[1]]).toEqual([
      "mutedForeground",
      "selected",
    ]);
  });

  it("rejects each figure one rounding step away", () => {
    [...catalogueNames, ledgerName].forEach((name) => {
      const entry = find(name);
      const derived = derive(entry);
      const wrong = (
        derived.ratio + 10 ** -entry.decimals
      ).toFixed(entry.decimals);

      expect(wrong, name).not.toBe(derived.figure);
      expect(
        quotesFigure(documentOf(entry), entry, wrong),
        `${name} must not accept ${wrong}`,
      ).toBe(false);
    });
  });
});
