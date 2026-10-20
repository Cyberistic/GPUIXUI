/**
 * Guards the figures the palette's own inline rationales state. Plans 737, 729
 * and 504 shipped the pairs and the values, but the comments beside the entries
 * were never read: `disabled-fill-claims.test.ts` reads the `lightColors` doc
 * block and the role JSDoc, `soft-panel-caption-tier.test.ts` derives the current
 * step, and neither sees a `//` line. A palette edit that stays above every floor
 * therefore leaves the file a consumer copies quoting a margin the package no
 * longer produces — the class plans 785, 798, 799 and 800 closed for the platform
 * and recipe files.
 *
 * The pre-729 range needs no dead hexes: its own sentence names "the ramp's 950
 * stop", so the suite plants `palette[ramp][950]` on the shipped AAA light fills
 * and recomputes the caption/ink step. The historical `2.983:1` and `5.376:1`
 * defects the same file quotes belong to `ring-track.test.ts` and
 * `selection-link.test.ts`, which plant their pre-fix hexes and assert the exact
 * ratio.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  darkColors,
  highContrastDarkColors,
  highContrastLightColors,
  palette,
} from "./color.js";
import { compositeOver, contrastFloors, contrastRatio } from "./contrast.js";
import { statusTones } from "./styles.js";

const source = readFileSync(new URL("./color.ts", import.meta.url), "utf8");

/** Only the `//` lines, collapsed, so a multi-line sentence is one string. */
const comments = source
  .split("\n")
  .filter((line) => line.trimStart().startsWith("//"))
  .map((line) => line.trimStart().slice(2).trim())
  .join(" ")
  .replaceAll(/\s+/g, " ");

const fixed = (value: number, digits: number): string => value.toFixed(digits);

/** The en-dash range a rationale prints, at its own precision. */
const range = (ratios: ReadonlyArray<number>, digits: number): string =>
  `${fixed(Math.min(...ratios), digits)}–${fixed(Math.max(...ratios), digits)}`;

/** The accent ramp each status family's soft tint and ink were mixed from. */
const rampOf = {
  info: "blue",
  success: "green",
  warning: "amber",
  destructive: "red",
} as const;

describe("the palette's inline rationale figures", () => {
  it("holds the disabled fill's step off the panel it sits near", () => {
    const surfaces = ["muted", "popover"] as const;
    const steps = surfaces.map((surface) =>
      contrastRatio(darkColors.disabled, darkColors[surface]),
    );

    expect(
      fixed(Math.min(...steps), 3),
      "muted and popover are one value, so 'both' needs one figure",
    ).toBe(fixed(Math.max(...steps), 3));
    expect(darkColors.disabled).toBe(palette.neutral[800]);
    expect(darkColors.muted).toBe(palette.neutral[850]);
    expect(darkColors.popover).toBe(palette.neutral[850]);

    expect(comments).toContain(
      "Neutral-850 is the `muted` panel and the `popover`, so an unavailable " +
        "control had no fill on either; the next ramp step is the fill's own " +
        `neutral and clears both at ${fixed(steps[0] ?? Number.NaN, 3)}:1 ` +
        "(plan 737).",
    );
  });

  it("holds the AAA light panel inks to both steps they quote", () => {
    const colors = highContrastLightColors;
    const before = statusTones.map(
      (tone) =>
        contrastRatio(palette[rampOf[tone]][950], colors[`${tone}Soft`]) /
        contrastRatio(colors.mutedForeground, colors[`${tone}Soft`]),
    );
    const after = statusTones.map(
      (tone) =>
        contrastRatio(colors[`${tone}SoftForeground`], colors[`${tone}Soft`]) /
        contrastRatio(colors.mutedForeground, colors[`${tone}Soft`]),
    );

    expect(range(before, 3)).toBe("1.003–1.042");
    expect(range(after, 3)).toBe("1.109–1.133");

    expect(comments).toContain(
      "The four panel inks sit one step below the ramp's 950 stop: the AAA " +
        `caption (\`mutedForeground\` \`${colors.mutedForeground}\`) is far ` +
        `above its ${contrastFloors.high.body}:1 floor, so the 950 values left ` +
        `a caption and the panel's own ink ${range(before, 3)}:1 apart. These ` +
        `keep a ${range(after, 3)}:1 step on every tint (plan 729).`,
    );
  });

  it("holds the AAA raised action and its label through the inverse veil", () => {
    const colors = highContrastDarkColors;
    const throughVeil = contrastRatio(
      colors.softActionForeground,
      compositeOver(colors.selectionOnFill, colors.softAction),
    );
    const tightestFill = Math.min(
      ...statusTones.map((tone) =>
        contrastRatio(colors.softAction, colors[`${tone}Soft`]),
      ),
    );

    expect(fixed(throughVeil, 3)).toBe("7.165");
    expect(fixed(tightestFill, 3)).toBe("1.071");

    expect(comments).toContain(
      "One step darker than the identity dark fill: the AAA white label keeps " +
        `its ${contrastFloors.high.body}:1 floor through the inverse selection ` +
        `veil (${fixed(throughVeil, 3)}:1) and the raised action still clears ` +
        `${contrastFloors.high.step}:1 on every AAA soft tint ` +
        `(${fixed(tightestFill, 3)}:1 at the tightest).`,
    );
  });
});
