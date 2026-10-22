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
  highContrastLightTheme,
  highContrastThemes,
  indicatorFailures,
  indicatorRoles,
  indicatorSurfaces,
  lightTheme,
  palette,
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

    // A wash a row wears is the tightest strip in the whole set: macOS dark's
    // primary mark against the `accent` a list row tints under its own pointer
    // is 3.06:1, the least headroom over the 3:1 floor in the 16 styles.
    expect(tightest.role).toBe("primary");
    expect(tightest.surface).toBe("accent");
    expect(tightest.theme).toBe("Dark · macOS");
    expect(tightest.ratio).toBeCloseTo(3.06, 2);
  });
});

/**
 * Guards the mark a **list row** carries on the wash it wears.
 *
 * The mark contract measured the two washes a menu or combobox row tints
 * (`hover`/`active`) and neither of the two a list row wears: `list.tsx` tints
 * `accent` under the pointer, keeps `active` while the press that opened a
 * surface is down, and fills `selected` once the row is chosen, while its
 * `leading` slot is documented as the place for an `Avatar` (`docs/list.mdx`) —
 * and an avatar's presence dot is a mark. Nothing measured the dot on the row a
 * reader had chosen, and Luna light's success fill measured 2.99:1 on the look's
 * selected wash: a presence dot that disappears exactly when the conversation it
 * belongs to is selected.
 */
describe("a mark on the row a reader chose", () => {
  it("measures the two washes a list row wears", () => {
    expect(indicatorSurfaces).toEqual(
      expect.arrayContaining(["accent", "selected"]),
    );
  });

  it("holds the painters the strips exist for", () => {
    const list = readFileSync(
      new URL("../../components/src/list.tsx", import.meta.url),
      "utf8",
    );
    const avatar = readFileSync(
      new URL("../../components/src/avatar.tsx", import.meta.url),
      "utf8",
    );

    // The row: a hover tints `accent`, the pointer's press `active`, and a
    // chosen row fills `selected`.
    expect(list).toContain("hover: { backgroundColor: theme.colors.accent }");
    expect(list).toContain("active: { backgroundColor: theme.colors.active }");
    expect(list).toContain("backgroundColor: theme.colors.selected");
    // The dot: every state paints a role the mark table measures.
    expect(avatar).toContain("theme.colors.success");
    expect(avatar).toContain("theme.colors.destructive");
    expect(avatar).toContain("theme.colors.mutedForeground");
    expect(avatar).toContain('statusTone(theme, "warning").foreground');
    expect(
      (["success", "destructive", "mutedForeground"] as const).filter(
        (role) => !indicatorRoles.includes(role),
      ),
    ).toEqual([]);
  });

  it("reports the presence dot Luna light lost on its selected row", () => {
    // The value the look carried before this step: the shared success step.
    const before = extendTheme(retroTheme(themes.light, "luna"), {
      colors: { success: palette.green[600] },
    });
    const marked = indicatorFailures(before)
      .filter(
        ({ role, surface }) => role === "success" && surface === "selected",
      )
      .map(({ ratio }) =>
        ratio === undefined ? "unmeasurable" : ratio.toFixed(2),
      );

    expect(marked).toEqual(["2.99"]);
    expect(indicatorFailures(retroTheme(themes.light, "luna"))).toEqual([]);
  });

  it("reports a mark painted in the row's own wash", () => {
    const brand = extendTheme(lightTheme, {
      colors: { selected: lightTheme.colors.success },
    });
    const marked = indicatorFailures(brand)
      .filter(
        ({ role, surface }) => role === "success" && surface === "selected",
      )
      .map(({ ratio }) =>
        ratio === undefined ? "unmeasurable" : ratio.toFixed(2),
      );

    expect(marked).toEqual(["1.00"]);
  });

  it("keeps a mark visible on the rows' washes in all 16 styles", () => {
    const rows = shipped.flatMap((theme) =>
      indicatorFailures(theme)
        .filter(({ surface }) => surface === "accent" || surface === "selected")
        .map(
          ({ role, surface, ratio }) =>
            `${theme.name} ${role}/${surface} ${ratio}`,
        ),
    );

    expect(rows).toEqual([]);
    // The catalogue prints the tightest placement, so the page and the sweep
    // cannot disagree about how much headroom the row washes leave.
    expect(catalogue).toContain("3.06:1");
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

/**
 * The mark floor is the theme's, not the caller's memory.
 *
 * `indicatorFailures(theme)` defaulted to the default 3:1 floor whatever the
 * theme declared, so a brand derived from a high-contrast theme — whose marks
 * must be found at 4.5:1 — passed a report whose floors its own variant does not
 * accept. `#6B6B6B` is a mark that clears 3:1 on every strip and only 3.67:1 and
 * 4.35:1 on the two washes a row tints under the pointer.
 */
describe("the floors an indicator report uses", () => {
  const brand = extendTheme(highContrastLightTheme, {
    colors: { primary: "#6B6B6B" },
  });

  it("holds the marks to the theme's own variant", () => {
    expect(indicatorFailures(brand, contrastFloors)).toEqual([]);
    expect(
      indicatorFailures(brand).map(({ role, surface, floor }) => ({
        role,
        surface,
        floor,
      })),
    ).toEqual([
      { role: "primary", surface: "hover", floor: 4.5 },
      { role: "primary", surface: "active", floor: 4.5 },
      { role: "primary", surface: "accent", floor: 4.5 },
      { role: "primary", surface: "selected", floor: 4.5 },
    ]);
  });

  it("keeps every shipped high-contrast mark at its own floor", () => {
    // The variant floors are the ones the gate already used, so this is a
    // guard rather than a change: the high-contrast pair must still pass.
    expect(
      Object.values(highContrastThemes).flatMap((theme) =>
        indicatorFailures(theme),
      ),
    ).toEqual([]);
  });
});
