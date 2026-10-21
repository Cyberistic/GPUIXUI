/**
 * Guards the selection wash, the one translucent role painted behind text the
 * reader is looking at.
 *
 * The bug this holds: `selection` was documented as the text-selection wash,
 * carried by all four colour sets and every platform and authored style, and
 * measured by nothing — `contrastRatio` refuses a translucent colour, so the
 * text contract never saw the wash or the text inside it. Measuring it found
 * three shipped styles under the body floor: Linux dark at 6.63:1 on its card,
 * Windows dark at 6.33:1, and Luna dark at 6.80:1 on its popover. Each now
 * carries the base dark theme's 24% share instead of 30%.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { lightColors } from "./color.js";
import { contrastFloors } from "./contrast.js";
import { decorativeFloor } from "./decorative.js";
import { platformNames } from "./platforms.js";
import { retroNames, retroTheme } from "./retro.js";
import { selectionFailures, selectionPairs } from "./selection.js";
import {
  invisibleSelectionBrand,
  report,
  selectionWashesAreReadable,
  unreadableSelectionBrand,
} from "./selection.example.js";
import {
  darkTheme,
  highContrastDarkTheme,
  highContrastLightTheme,
  lightTheme,
  platformTheme,
  themes,
} from "./theme.js";

const shippedThemes = [
  lightTheme,
  darkTheme,
  highContrastLightTheme,
  highContrastDarkTheme,
] as const;

const platformThemes = platformNames.flatMap((name) => [
  platformTheme(themes.light, name),
  platformTheme(themes.dark, name),
]);

const retroThemes = retroNames.flatMap((look) => [
  retroTheme(themes.light, look),
  retroTheme(themes.dark, look),
]);

const measured = (over: string): boolean =>
  selectionPairs.some((pair) => pair.background === over);

/** The text role each content surface already carries before a wash is painted. */
const restingText: Readonly<Record<string, string>> = {
  input: "inputForeground",
  background: "foreground",
  card: "cardForeground",
  popover: "popoverForeground",
};

describe("the pairs a selection is measured on", () => {
  it("covers every content surface body text is selected from", () => {
    const missing = Object.keys(restingText).filter((over) => !measured(over));

    expect(missing).toEqual([]);
  });

  it("keeps the text role each surface already carries", () => {
    const wrong = selectionPairs
      .filter(
        ({ background, foreground }) => restingText[background] !== foreground,
      )
      .map(({ background }) => background);

    expect(wrong).toEqual([]);
  });
});

describe("every theme the library ships", () => {
  it("keeps its selection visible and its text readable", () => {
    [...shippedThemes, ...platformThemes, ...retroThemes].forEach((theme) => {
      expect(selectionFailures(theme), theme.name).toEqual([]);
    });
  });

  it("is a real set, so a scan that stopped iterating cannot pass", () => {
    expect(
      shippedThemes.length + platformThemes.length + retroThemes.length,
    ).toBeGreaterThanOrEqual(16);
  });
});

describe("selectionFailures", () => {
  it("reports the wash Linux dark shipped before this contract existed", () => {
    // The regression: a 30% wash over a card lighter than the base theme's left
    // the selected text at 6.63:1 against the 7:1 floor.
    const before = {
      colors: {
        ...platformTheme(themes.dark, "linux").colors,
        selection: "#78AEED4D",
      },
    };
    const failure = selectionFailures(before).find(
      ({ kind, background }) => kind === "legibility" && background === "card",
    );

    expect(failure?.floor).toBe(7);
    expect(failure?.ratio).toBeCloseTo(6.63, 2);
  });

  it("reports a wash that hides the text it selects", () => {
    const failures = selectionFailures(unreadableSelectionBrand);

    expect(failures.map(({ kind }) => kind)).toEqual([
      "legibility",
      "legibility",
      "legibility",
      "legibility",
    ]);
    expect(failures.map(({ background }) => background)).toEqual([
      "input",
      "background",
      "card",
      "popover",
    ]);
  });

  it("reports a wash the reader cannot find", () => {
    const failures = selectionFailures(invisibleSelectionBrand);

    expect(failures.map(({ kind }) => kind)).toEqual([
      "visibility",
      "visibility",
      "visibility",
      "visibility",
    ]);
    failures.forEach(({ ratio, floor }) => {
      expect(ratio).toBe(1);
      expect(floor).toBe(decorativeFloor);
    });
  });

  it("reports a surface it cannot measure rather than skipping it", () => {
    // A translucent page cannot be composited: the wash over it has no ratio,
    // and an unverifiable wash is a failure, not a pass.
    const broken = {
      colors: { ...lightColors, background: "#F6F8FA80" },
    };
    const failure = selectionFailures(broken).find(
      ({ kind, background }) =>
        kind === "visibility" && background === "background",
    );

    expect(failure).toBeDefined();
    expect(failure?.ratio).toBeUndefined();
  });

  it("takes a floor set, so a stricter brand can run the check it needs", () => {
    const strict = { body: 21, secondary: 21, boundary: 21, disabled: 21 };

    expect(selectionFailures(lightTheme, strict).length).toBe(
      selectionPairs.length,
    );
  });

  it("passes the default floors a theme with no variant declares", () => {
    expect(selectionFailures(lightTheme, contrastFloors)).toEqual([]);
  });
});

describe("the documented example", () => {
  it("passes the shipped theme and reports both broken brands", () => {
    expect(selectionWashesAreReadable(lightTheme)).toBe(true);
    expect(selectionWashesAreReadable(unreadableSelectionBrand)).toBe(false);
    expect(selectionWashesAreReadable(invisibleSelectionBrand)).toBe(false);
    expect(report(lightTheme)).toEqual([]);
    expect(report(unreadableSelectionBrand)).toContain(
      "legibility: cardForeground on card is 1.00",
    );
    expect(report(invisibleSelectionBrand)).toContain(
      "visibility: foreground on background is 1.00",
    );
  });
});

describe("the documents describe the contract they are held to", () => {
  const read = (path: string): string =>
    readFileSync(new URL(path, import.meta.url), "utf8");

  it("documents the check, both floors and the surfaces", () => {
    const catalogue = read("../../../docs/tokens.md");
    const design = read("../../../docs/design-system.md");

    expect(catalogue).toContain("selectionFailures");
    expect(catalogue).toContain("## Text selection");
    expect(catalogue).toContain(`${decorativeFloor}:1`);
    expect(design).toContain("selection wash");
  });
});
