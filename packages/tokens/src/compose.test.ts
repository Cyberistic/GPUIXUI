/**
 * Guards the order a style and a brand compose in.
 *
 * The defect this closes: `applyStyle(base, style)` overlays a look's **partial**
 * palette on whatever it is handed, and a `Theme` does not record that it
 * already wears one — so two shipped looks stack silently. Measured on
 * 2026-10-24, `applyStyle(retroTheme(lightTheme, "luna"), platformStyles.win32)`
 * fails 5 placements (a `ring` on the platform's `secondary` at **2.90:1** under
 * the 3:1 boundary floor, and four decorative placements under 1.05:1) and
 * `applyStyle(retroTheme(darkTheme, "omarchy"), platformStyles.linux)` fails 24
 * (5 contrast, 5 decorative, 5 selection and 9 highlight, including selection
 * washes that hide the text they select). The safe order is base, style, brand —
 * `extendTheme(platformTheme(themes.dark, "win32"), { … })` — and a style is a
 * look over a base, not a layer over a look.
 *
 * Both halves are derived from `auditTheme`: the passing base × style matrix and
 * the failing two-look pairs. A palette edit that breaks a style over a base, or
 * makes a stacked pair pass, fails here together with the pages that print the
 * rule. `node:fs` is deliberate, as in `docs.test.ts`: this reads the
 * repository's own Markdown, and the package keeps zero runtime dependencies.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { auditTheme } from "./audit.js";
import {
  platformNames,
  platformStyles,
  type PlatformStyle,
} from "./platforms.js";
import { resolveHouseTheme } from "./platforms.example.js";
import { resolveRetroBrand } from "./retro.example.js";
import { retroNames, retroStyles, retroTheme } from "./retro.js";
import {
  applyStyle,
  highContrastThemes,
  themeModes,
  themes,
  type Theme,
} from "./theme.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

/** A page's prose with its line wrapping removed, so a sentence reads whole. */
const flat = (text: string): string => text.replace(/\s+/g, " ");

const catalogue = flat(read("../../../docs/tokens.md"));
const designSystem = flat(read("../../../docs/design-system.md"));
const readme = flat(read("../README.md"));
const seam = flat(read("./theme.ts"));

/** Every style a consumer can apply, under the name a page prints it with. */
const styles: ReadonlyArray<{
  readonly page: string;
  readonly style: PlatformStyle;
}> = [
  ...platformNames.map((name) => ({
    page: `platform \`${name}\``,
    style: platformStyles[name],
  })),
  ...retroNames.map((name) => ({
    page: `look \`${name}\``,
    style: retroStyles[name],
  })),
];

/** The styles split by the table they come from, so one case is not 28 audits. */
const styleGroups: ReadonlyArray<{
  readonly label: string;
  readonly styles: ReadonlyArray<{
    readonly page: string;
    readonly style: PlatformStyle;
  }>;
}> = [
  { label: "platform style", styles: styles.slice(0, platformNames.length) },
  { label: "authored look", styles: styles.slice(platformNames.length) },
];

/** The four shipped themes a style is applied to. */
const bases: ReadonlyArray<{ readonly name: string; readonly theme: Theme }> =
  themeModes.flatMap((mode) => [
    { name: `the ${mode} theme`, theme: themes[mode] },
    {
      name: `the high-contrast ${mode} theme`,
      theme: highContrastThemes[mode],
    },
  ]);

/** The counts one audit prints, per contract that measured a placement. */
const report = (theme: Theme) => {
  const audit = auditTheme(theme);
  return {
    contrast: audit.contrast.length,
    decorative: audit.decorative.length,
    selection: audit.selection.length,
    highlight: audit.highlight.length,
    passed: audit.passed,
  };
};

describe("composing a style and a brand", () => {
  it("derives the matrix from both style indexes and both contrast variants", () => {
    expect(bases.length).toBe(themeModes.length * 2);
    expect(styles.length).toBe(platformNames.length + retroNames.length);
    expect(styleGroups.map(({ styles }) => styles.length)).toEqual([
      platformNames.length,
      retroNames.length,
    ]);
  });

  bases.forEach(({ name, theme }) => {
    styleGroups.forEach(({ label, styles: group }) => {
      it(`resolves every ${label} over ${name}`, () => {
        const failed = group.flatMap(({ page, style }) =>
          auditTheme(applyStyle(theme, style)).passed
            ? []
            : [`${page} over ${name}`],
        );

        expect(failed).toEqual([]);
      });
    });
  });

  it("rejects a second look over a look", () => {
    // Two partial palettes land on each other: the second look's roles are
    // designed for its own surfaces, not for the first look's. The counts are
    // the measured evidence behind the rule the pages state.
    const lunaOverWindows = applyStyle(
      retroTheme(themes.light, "luna"),
      platformStyles.win32,
    );
    const omarchyOverLinux = applyStyle(
      retroTheme(themes.dark, "omarchy"),
      platformStyles.linux,
    );

    expect(report(lunaOverWindows)).toEqual({
      contrast: 1,
      decorative: 4,
      selection: 0,
      highlight: 0,
      passed: false,
    });
    expect(report(omarchyOverLinux)).toEqual({
      contrast: 5,
      decorative: 5,
      selection: 5,
      highlight: 9,
      passed: false,
    });
  });

  it("keeps a brand over the resolved style passing", () => {
    themeModes.forEach((mode) => {
      // The documented order, executed: base, style, brand. Both examples run
      // the whole gate, not only the contrast and decorative contracts.
      expect(auditTheme(resolveHouseTheme(mode)).passed).toBe(true);
      expect(auditTheme(resolveRetroBrand(mode)).passed).toBe(true);
    });
  });

  it("states the rule on both token pages, the README and the seam", () => {
    const rule = "a style is a look over a base, not a layer over a look";
    const order = "the order is base, style, brand";

    [catalogue, designSystem, readme, seam].forEach((page) => {
      expect(page.toLowerCase()).toContain(rule);
      expect(page.toLowerCase()).toContain(order);
    });
  });

  it("prints the stacked pair it rejects", () => {
    const pair = `applyStyle(retroTheme(themes.light, "luna"), platformStyles.win32)`;

    expect(catalogue).toContain(pair);
  });
});
