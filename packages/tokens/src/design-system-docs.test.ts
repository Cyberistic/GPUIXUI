/**
 * Holds `docs/design-system.md`'s numbers to the tokens they describe.
 *
 * The bug this guards: the design-system page is the reasoning a consumer reads
 * before adopting the library, and it prints concrete numbers — role count,
 * density heights, type sizes, spacing, radii, platform radii and avatar
 * diameters. `docs.test.ts` guards the token catalogue in `docs/tokens.md`, but
 * nothing read this page, so a scale change could leave it teaching a system the
 * package no longer ships. Each check fails on a changed token or a contradiction
 * in the prose, whichever drifts first.
 *
 * `node:fs` is deliberate, as in `docs.test.ts` and `inventory.test.ts`: this
 * checks the repository's own Markdown, and the package keeps zero runtime
 * dependencies.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { colorRoles, darkColors, lightColors } from "./color.js";
import { platformNames, platformStyles } from "./platforms.js";
import { avatarSize, densityPresets, radius, spacing } from "./scale.js";
import { typography } from "./typography.js";

const doc = readFileSync(
  new URL("../../../docs/design-system.md", import.meta.url),
  "utf8",
);

/** The three platforms with their own style; `default` is the identity. */
const styled = platformNames.filter((name) => name !== "default");
const styleOf = (platform: (typeof styled)[number]) => platformStyles[platform];

/** The one capture group of `pattern`, asserted to exist. */
const capture = (pattern: RegExp): string => {
  const match = pattern.exec(doc)?.[1];
  expect(
    match,
    `docs/design-system.md no longer matches ${pattern}`,
  ).toBeDefined();
  return match ?? "";
};

/** The integers a captured list prints, in order. */
const numbers = (text: string): ReadonlyArray<number> =>
  (text.match(/\d+/g) ?? []).map(Number);

/** The numbers a captured `4/6/10/14` list prints. */
const slashed = (text: string): ReadonlyArray<number> =>
  text.split("/").map(Number);

describe("docs/design-system.md", () => {
  it("prints the role count the themes expose", () => {
    expect(Number(capture(/exactly the same (\d+) roles/))).toBe(
      colorRoles.length,
    );
    expect(Object.keys(lightColors).length).toBe(colorRoles.length);
    expect(Object.keys(darkColors).length).toBe(colorRoles.length);
  });

  it("prints the spacing scale in order", () => {
    const printed = numbers(
      capture(/Spacing is a 4px-derived scale: ([\d,\s]+)\./),
    );
    expect(printed).toEqual(Object.values(spacing));
  });

  it("prints the radius scale in order", () => {
    const printed = numbers(capture(/Radii: ([\d,\s]+), full\./));
    expect(printed).toEqual([
      radius.none,
      radius.sm,
      radius.md,
      radius.lg,
      radius.xl,
    ]);
  });

  it("prints the avatar diameters", () => {
    expect(numbers(capture(/diameter scale — ([\d,\s]+) —/))).toEqual(
      Object.values(avatarSize),
    );
  });

  it("prints each density preset's control heights and row height", () => {
    const drift = Object.values(densityPresets).flatMap((preset) => {
      const pattern = new RegExp(
        `- \`${preset.name}\` — ([\\d/]+) controls, (\\d+)px rows`,
      );
      const match = pattern.exec(doc);
      return match !== null &&
        slashed(match[1] ?? "").join() ===
          Object.values(preset.controlHeight).join() &&
        Number(match[2]) === preset.rowHeight
        ? []
        : [`${preset.name}: ${match?.[0] ?? "no row"}`];
    });

    expect(drift).toEqual([]);
  });

  it("prints each platform's radius scale", () => {
    const printed = [
      slashed(capture(/macOS ([\d/]+), Linux/)),
      slashed(capture(/Linux ([\d/]+), Windows/)),
      slashed(capture(/Windows ([\d/]+),\s+against/)),
      slashed(capture(/against the default ([\d/]+)/)),
    ];
    const shipped = styled.map((platform) => {
      const scale = styleOf(platform).radius;
      return [scale.sm, scale.md, scale.lg, scale.xl];
    });

    expect(printed).toEqual([
      ...shipped,
      [radius.sm, radius.md, radius.lg, radius.xl],
    ]);
  });

  it("names the density each platform style carries", () => {
    const printed: ReadonlyArray<readonly [string, RegExp]> = [
      ["darwin", /macOS `(\w+)`/],
      ["linux", /GNOME `(\w+)`/],
      ["win32", /Windows `(\w+)`/],
    ];
    const drift = printed.flatMap(([platform, pattern]) => {
      const name = capture(pattern);
      const carries = styled.find((known) => known === platform);
      return carries !== undefined && styleOf(carries).density === name
        ? []
        : [`${platform}: ${name}`];
    });

    expect(drift).toEqual([]);
  });

  it("prints type sizes that are the scale's own", () => {
    const sizes = new Set(
      Object.values(typography)
        .filter((role) => typeof role === "object")
        .map((role) => `${role.fontSize}/${role.lineHeight}`),
    );
    const section = doc.slice(
      doc.indexOf("## 5. Typography"),
      doc.indexOf("## 6."),
    );
    const printed = [...section.matchAll(/(\d+)\/(\d+)/g)].map(
      (match) => `${match[1]}/${match[2]}`,
    );

    expect(printed.length).toBeGreaterThanOrEqual(5);
    expect(printed.filter((pair) => !sizes.has(pair))).toEqual([]);
  });
});
