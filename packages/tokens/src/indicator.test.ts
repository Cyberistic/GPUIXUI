/**
 * Guards the contract for an **indicator mark** — a progress fill, a spinner
 * dot, a slider's filled span, a switch's on-state, a presence dot.
 *
 * Nothing measured one before: `primary` was only ever measured against its own
 * on-colour, so a bar or dot painted in a role that matches the page passed every
 * suite. The first thing the contract finds is the *solid* status role: light
 * `warning` is a pale amber designed to carry near-black text, and it is 1.78:1
 * on the page, so a status dot painted in it is the one mark nobody can find.
 * That is why a status mark paints the tone's readable role instead, and both
 * halves are measured here.
 *
 * `node:fs` is deliberate, as in `docs.test.ts`: this checks the repository's own
 * Markdown, and the package keeps zero runtime dependencies by design.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  contrastFloors,
  contrastFloorsFor,
  contrastRatio,
  extendTheme,
  highContrastFloors,
  highContrastThemes,
  indicatorFailures,
  indicatorRoles,
  indicatorSurfaces,
  lightTheme,
  platformNames,
  platformTheme,
  retroNames,
  retroTheme,
  statusTone,
  statusTones,
  themes,
  type Theme,
} from "./index.js";

const catalogue = readFileSync(
  new URL("../../../docs/tokens.md", import.meta.url),
  "utf8",
);

const shipped: ReadonlyArray<Theme> = [
  ...Object.values(themes),
  ...Object.values(highContrastThemes),
  ...platformNames.flatMap((platform) =>
    Object.values(themes).map((theme) => platformTheme(theme, platform)),
  ),
  ...retroNames.flatMap((look) =>
    Object.values(themes).map((theme) => retroTheme(theme, look)),
  ),
];

/** Every mark placement the library paints, with the ratio it measured. */
const placements = (theme: Theme) =>
  indicatorRoles.flatMap((role) =>
    indicatorSurfaces.map((surface) => ({
      role,
      surface,
      ratio: contrastRatio(theme.colors[role], theme.colors[surface]),
      floor: contrastFloorsFor(theme).boundary,
    })),
  );

describe("every shipped theme shows its marks", () => {
  it("passes the contract in all 16 themes", () => {
    expect(shipped.length).toBeGreaterThanOrEqual(16);
    expect(
      shipped
        .filter((theme) => indicatorFailures(theme).length > 0)
        .map((theme) => theme.name),
    ).toEqual([]);
  });

  it("has a tightest placement, so the sweep measures something", () => {
    // Measured, not assumed: the first contract run names its worst pair, so a
    // palette edit that eats the margin shows up here rather than in a report.
    const tightest = shipped
      .flatMap((theme) =>
        placements(theme).map((placement) => ({
          theme: theme.name,
          ...placement,
        })),
      )
      .reduce((low, placement) =>
        (placement.ratio ?? 0) / placement.floor < (low.ratio ?? 0) / low.floor
          ? placement
          : low,
      );

    // A pressed row's wash is the tightest strip in the whole set: Luna light's
    // success mark against the wash its own pointer paints is 3.05:1.
    expect(tightest.role).toBe("success");
    expect(tightest.surface).toBe("active");
    expect(tightest.theme).toBe("Light · Windows XP (Luna)");
    expect(tightest.ratio).toBeCloseTo(3.05, 2);
  });
});

/**
 * Guards the mark a checked or selected row carries on the wash it tints.
 *
 * The mark contract measured the four resting strips, and a checked menu row or
 * a selected combobox row is exactly where a mark sits while the row reacts: the
 * tick is painted `primary` (`menu/item.tsx`, `combobox.tsx`) and the row washes
 * itself `hover` on the pointer and `active` while pressed. Nothing measured
 * those two strips, and the documented Aero brand's dark `primary` measured
 * 1.70:1 and 1.46:1 on them — a tick that vanished the moment the reader moved
 * the pointer onto its own row. The washes now join `indicatorSurfaces`, so the
 * report and the audit gate cover them with no new API.
 */
describe("a mark on the wash a row tints", () => {
  it("measures the two washes a row repaints", () => {
    expect(indicatorSurfaces).toEqual(
      expect.arrayContaining(["hover", "active"]),
    );
  });

  it("holds the two painters the strips exist for", () => {
    const menu = readFileSync(
      new URL("../../components/src/menu/item.tsx", import.meta.url),
      "utf8",
    );
    const combobox = readFileSync(
      new URL("../../components/src/combobox.tsx", import.meta.url),
      "utf8",
    );

    expect(menu).toContain("color={theme.colors.primary}");
    expect(menu).toContain("hover: disabled ? undefined");
    expect(menu).toContain("backgroundColor: theme.colors.hover");
    expect(menu).toContain("backgroundColor: theme.colors.active");
    expect(combobox).toContain("color={theme.colors.primary}");
    expect(combobox).toContain(
      "backgroundColor: state.highlighted ? theme.colors.hover : undefined",
    );
  });

  it("reports the brand tick the washes hid", () => {
    // The documented Aero brand, before it owned a per-mode primary: its single
    // dark blue sat on the look's own dark washes.
    const look = retroTheme(themes.dark, "aero");
    const brand = extendTheme(look, {
      colors: {
        primary: "#0F5E8C",
        primaryForeground: "#FFFFFF",
      },
    });
    const marked = indicatorFailures(brand)
      .filter(({ role }) => role === "primary")
      .map(({ surface, ratio }) => [
        surface,
        ratio === undefined ? undefined : ratio.toFixed(2),
      ]);

    expect(marked).toEqual(
      expect.arrayContaining([
        ["hover", "1.70"],
        ["active", "1.46"],
      ]),
    );
  });
});

describe("a status mark paints the readable role, not the solid fill", () => {
  it("measures the solid warning role below the mark floor", () => {
    // The role is a surface that carries near-black text, not a mark: 1.78:1 on
    // the page means a warning dot or bar painted in it disappears on white.
    expect(
      contrastRatio(lightTheme.colors.warning, lightTheme.colors.background),
    ).toBeCloseTo(1.78, 2);
    expect(lightTheme.colors.warning).not.toBe(
      statusTone(lightTheme, "warning").foreground,
    );
  });

  it("measures the tone's readable role above it, on every strip", () => {
    const missing = statusTones.flatMap((tone) =>
      indicatorSurfaces.flatMap((surface) => {
        const ratio = contrastRatio(
          statusTone(lightTheme, tone).foreground,
          lightTheme.colors[surface],
        );
        return ratio !== undefined &&
          ratio >= contrastFloors.boundary &&
          indicatorRoles.includes(`${tone}SoftForeground`)
          ? []
          : [`${tone}/${surface}`];
      }),
    );

    expect(missing).toEqual([]);
  });

  it("names a mark role for every status tone", () => {
    const missing = statusTones.filter(
      (tone) => !indicatorRoles.includes(`${tone}SoftForeground`),
    );

    expect(missing).toEqual([]);
  });
});

describe("a mark it cannot measure is reported, not skipped", () => {
  it("reports a translucent fill on every strip", () => {
    const translucent = extendTheme(lightTheme, {
      colors: { primary: "#00000080" },
    });
    const primary = indicatorFailures(translucent).filter(
      (failure) => failure.role === "primary",
    );

    expect(primary.map(({ surface, ratio }) => [surface, ratio])).toEqual(
      indicatorSurfaces.map((surface) => [surface, undefined]),
    );
  });
});

describe("a caller's floor set is honoured", () => {
  it("reports the pair the default floors pass at 4.5:1", () => {
    // Every shipped theme clears the default floor; a caller holding a default
    // theme to the high-contrast floor finds the tight pair by name.
    expect(indicatorFailures(lightTheme)).toEqual([]);
    expect(
      indicatorFailures(lightTheme, highContrastFloors).map(
        ({ role, surface, floor }) => `${role}/${surface} ${floor}`,
      ),
    ).toContain("success/muted 4.5");
  });
});

describe("the catalogue documents the contract", () => {
  it("documents every public name and the counts it prints", () => {
    ["indicatorRoles", "indicatorSurfaces", "indicatorFailures"].forEach(
      (name) => expect(catalogue).toContain(name),
    );
    expect(catalogue).toContain(
      `The ${indicatorRoles.length} mark roles, on the ${indicatorSurfaces.length} strips`,
    );
  });
});
