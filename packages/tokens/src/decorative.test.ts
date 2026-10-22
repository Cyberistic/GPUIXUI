/**
 * Guards the perceptibility floor for the surfaces that carry no text.
 *
 * The bug this holds: the contrast contract measured text and boundaries only,
 * so a divider, a skeleton fill or a modal veil could ship the same value as
 * the surface it is painted on — an invisible rule, a loading block that reads
 * as an empty row, a dialog with no layer behind it. Two shipped platform
 * palettes did exactly that: macOS light's inherited skeleton reached 1.045:1
 * on its muted strip and Linux dark's reached 1.004:1 on its card, so both
 * styles now carry a `skeleton` of their own.
 *
 * The floating strip was the one the skeleton contract still missed: a dialog
 * whose body is loading paints its placeholder rows on the dialog's own
 * `popover` fill, and the three dark platform styles carried a skeleton
 * 1.031–1.049:1 from that fill — a loading dialog that looked empty. They carry
 * their own placeholder fill now, and the placement is in the table so a brand
 * cannot repeat it.
 *
 * The state washes joined the same contract because they had the same hole and
 * a worse symptom: the base dark theme's `hover` was its `popover`, so hovering
 * a menu row repainted the surface it already sat on, and the base light
 * theme's `hover` was its `muted` toolbar; macOS light's `hover` was its own
 * muted strip, and Windows light's and Linux dark's were within a step of one.
 * Those five now carry a wash a reader can see.
 *
 * The tonal action's resting fill joined last, and it is the same defect one
 * control over: `secondary` is a filled variant with no border and no brand
 * colour, so the fill is the whole button. The base light theme shipped it
 * equal to `muted` (1.000:1), which made a secondary button inside a muted
 * toolbar a label with no button around it; macOS light's window sat at
 * 1.015:1, Linux light at 1.040:1, Windows light at 1.021:1, and the four dark
 * platform/look palettes fell at 1.021–1.049:1 on their lighter popovers. Each
 * of those styles now carries its own control face.
 *
 * The status tint joined last, and it is the surface a message actually sits in:
 * `xSoft` appeared only as the background a `statusEdge` was measured over, so a
 * tint that matched its strip passed every suite. Measured, the base light
 * theme's `successSoft` was 1.006:1 on its `muted` toolbar, Luna light's
 * `infoSoft` was its own beige page at 1.00:1, and macOS light, Windows light,
 * Aero light and the three lighter dark popovers were all within 5% — an alert
 * or a soft badge in one had no surface of its own. The light tints now sit one
 * ramp step deeper (the 200 step with the 900 text), the dark ones one step
 * lighter (800 with the 100 text), and Luna — whose beige page is at the same
 * lightness a pale tint has — carries a lighter tint of its own.
 *
 * The elevation tint joined last, and it is the one surface the page said was
 * deliberately outside this contract: a shadow is a blurred geometry, so a flat
 * composite overstates what the eye receives. It overstates in the safe
 * direction — the deepest level is a ceiling, and only a shadow that cannot be
 * seen at all is reported — and the gap was real: the high-contrast dark theme
 * tints its shadows with black on a pure-black page, so **every** level measured
 * 1.00:1 there and no raised surface in that variant had a shadow. Its tint is
 * the grey its raised controls use now, and the scale reads 1.09–1.37:1 across
 * the five strips it can fall on.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  alpha,
  alphaOf,
  blend,
  highContrastDarkColors,
  highContrastLightColors,
  lightColors,
  palette,
  type ThemeColors,
} from "./color.js";
import { contrastRatio } from "./contrast.js";
import {
  actionFeedbackPlacements,
  decorativeFailures,
  decorativeFloor,
  decorativeSurfaces,
} from "./decorative.js";
import {
  decorativeSurfacesAreVisible,
  edgeLessBrand,
  flatActionBrand,
  flatShadowBrand,
  flatSkeletonBrand,
  report,
  unavailableActionBrand,
} from "./decorative.example.js";
import { statusEdgeAlpha, statusTone, statusTones } from "./styles.js";
import { platformNames, platformStyles } from "./platforms.js";
import { retroNames, retroTheme } from "./retro.js";
import {
  darkTheme,
  extendTheme,
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

/** Every platform style in both modes, as `platformTheme` resolves it. */
const platformThemes = platformNames
  .filter((name) => name !== "default")
  .flatMap((name) => [
    platformTheme(themes.light, name),
    platformTheme(themes.dark, name),
  ]);

const measured = (surface: string, role: string, over: string): boolean =>
  decorativeSurfaces.some(
    (entry) =>
      entry.surface === surface && entry.role === role && entry.over === over,
  );

describe("decorative surfaces", () => {
  it("measures a divider on every surface it can rule", () => {
    const missing = ["background", "card", "popover", "muted"].filter(
      (over) => !measured("divider", "border", over),
    );

    expect(missing).toEqual([]);
  });

  it("measures a skeleton on every surface it can stand in", () => {
    // A placeholder stands in for a row on a page, in a card, in a muted list
    // and in a dialog or popover whose body has not loaded. The floating strip
    // is the one the table missed: a loading dialog paints its skeleton rows on
    // the dialog's own `popover` fill, so a placeholder that matches it is an
    // empty dialog.
    const missing = ["background", "card", "popover", "muted"].filter(
      (over) => !measured("skeleton", "skeleton", over),
    );

    expect(missing).toEqual([]);
  });

  it("prints the skeleton's strips in the catalogue, from the placements themselves", () => {
    // The page lists the strips a placeholder is measured on, so a placement the
    // table gains cannot stay unprinted and a row cannot name a strip nobody
    // measures.
    const strips = decorativeSurfaces
      .filter(({ surface }) => surface === "skeleton")
      .map(({ over }) => `\`${over}\``)
      .join(", ");

    expect(
      readFileSync(new URL("../../../docs/tokens.md", import.meta.url), "utf8"),
    ).toContain(`| skeleton | \`skeleton\` | ${strips} |`);
  });

  it("reads the painters that put a placeholder on a dialog", () => {
    // The placement exists because a dialog's body is a placeholder's real home:
    // its content surface fills `popover` and the placeholder fills `skeleton`.
    // A painter that stopped painting either role would leave the pair behind.
    const primitives = readFileSync(
      new URL("../../primitives/src/recipe/index.ts", import.meta.url),
      "utf8",
    );
    const recipes = readFileSync(
      new URL("../../tw/src/recipes.ts", import.meta.url),
      "utf8",
    );
    const surface = (name: string): string =>
      new RegExp(`export const ${name} =\\s*"([^"]*)"`).exec(recipes)?.[1] ??
      "";

    expect(primitives).toContain('"shrink-0 bg-skeleton"');
    expect(surface("DIALOG_CONTENT")).toContain("bg-popover");
    expect(surface("POPOVER_CONTENT")).toContain("bg-popover");
    expect(surface("PREVIEW_CARD_CONTENT")).toContain("bg-popover");
  });

  it("measures a veil over the content surfaces a modal covers", () => {
    // A modal veils the whole window, not only the page under its own surface:
    // the sidebar's toolbar, a segmented panel, the field behind it and the row
    // the reader has chosen are all receded by the same role.
    const missing = [
      "card",
      "popover",
      "muted",
      "secondary",
      "input",
      "selected",
    ].filter((over) => !measured("scrim", "overlay", over));

    expect(missing).toEqual([]);
  });

  it("reports a veil that cannot recede the sidebar it covers", () => {
    // A veil painted in the toolbar's own colour leaves that strip at full
    // contrast behind a modal — the state a window with a sidebar actually has.
    const broken = { colors: { ...lightColors, overlay: lightColors.muted } };

    expect(
      decorativeFailures(broken).find(
        ({ surface, over }) => surface === "scrim" && over === "muted",
      ),
    ).toMatchObject({ ratio: 1, floor: decorativeFloor });
  });

  it("reports a veil painted in the row the reader chose", () => {
    // A confirmation dialog opens over the row it is about, so the selection is
    // behind the veil. A veil painted in that row's own fill leaves it exactly
    // as bright as it was before the dialog appeared.
    const broken = extendTheme(lightTheme, {
      colors: { overlay: lightTheme.colors.selected },
    });

    expect(
      decorativeFailures(broken).find(
        ({ surface, over }) => surface === "scrim" && over === "selected",
      ),
    ).toMatchObject({ ratio: 1, floor: decorativeFloor });
  });

  it("prints the veil's strips in the catalogue, from the placements themselves", () => {
    // The page lists the strips the veil is measured on, so a placement the table
    // gains cannot stay unprinted and a row cannot name a strip nobody measures.
    const strips = decorativeSurfaces
      .filter(({ surface }) => surface === "scrim")
      .map(({ over }) => `\`${over}\``)
      .join(", ");

    expect(
      readFileSync(new URL("../../../docs/tokens.md", import.meta.url), "utf8"),
    ).toContain(`| scrim | \`overlay\` | ${strips} |`);
  });

  it("measures every status edge where the message it bounds is measured", () => {
    // The tint's placements are the four strips a message sits on, and the edge
    // is the boundary around that same message: a warning alert in a
    // confirmation dialog's body sits on the dialog's `popover` fill, a soft
    // badge in a muted sidebar on `muted`. Measuring the edge on the two page
    // surfaces only left the two floating/quiet strips with a measured tint and
    // an edge nothing checked.
    const missing = statusTones.flatMap((tone) =>
      [`${tone}Soft`, "background", "card", "popover", "muted"]
        .filter((over) => !measured("statusEdge", tone, over))
        .map((over) => `${tone}/${over}`),
    );

    expect(missing).toEqual([]);
  });

  it("measures an edge on every strip its tint is measured on", () => {
    const tintStrips = [
      ...new Set(
        decorativeSurfaces
          .filter(({ surface }) => surface === "statusTint")
          .map(({ over }) => over),
      ),
    ];
    const edgeStrips = new Set(
      decorativeSurfaces
        .filter(({ surface }) => surface === "statusEdge")
        .map(({ over }) => over),
    );

    expect(tintStrips.filter((over) => !edgeStrips.has(over))).toEqual([]);
  });

  it("reports a status edge painted in the strip it bounds", () => {
    // A tone that is its own strip paints no boundary: the alert in a dialog is
    // then a tint a reader has to guess the edges of.
    const flatPopover = {
      colors: { ...lightColors, warning: lightColors.popover },
    };

    expect(
      decorativeFailures(flatPopover).find(
        ({ surface, role, over }) =>
          surface === "statusEdge" && role === "warning" && over === "popover",
      ),
    ).toMatchObject({ floor: decorativeFloor });
  });

  it("clears the floor on the tint and every strip, with Luna light tightest on a wash", () => {
    // The catalogue prints the tightest **strip** placement of the edge contract
    // — the tint it bounds is covered by the pass check but not printed, because
    // the sentence is about the strips a message or a badge crosses. The scope is
    // the four strips a message sits on and the four washes a soft badge crosses
    // inside a row.
    const lookThemes = retroNames.flatMap((look) => [
      retroTheme(themes.light, look),
      retroTheme(themes.dark, look),
    ]);
    const placements = [
      ...shippedThemes,
      ...platformThemes,
      ...lookThemes,
    ].flatMap((theme) =>
      statusTones.flatMap((tone) =>
        (
          [
            `${tone}Soft`,
            "background",
            "card",
            "popover",
            "muted",
            "hover",
            "active",
            "selected",
            "accent",
          ] satisfies ReadonlyArray<keyof ThemeColors>
        ).map((over) => ({
          theme: theme.name,
          tone,
          over,
          ratio: contrastRatio(
            blend(theme.colors[over], theme.colors[tone], statusEdgeAlpha),
            theme.colors[over],
          ),
        })),
      ),
    );

    expect(
      placements.filter(
        ({ ratio }) => ratio === undefined || ratio < decorativeFloor,
      ),
    ).toEqual([]);

    const tightest = placements
      .filter(({ over }) => !over.endsWith("Soft"))
      .reduce((low, placement) =>
        (placement.ratio ?? 0) < (low.ratio ?? 0) ? placement : low,
      );
    expect(tightest.theme).toBe("Light · Windows XP (Luna)");
    expect(tightest.tone).toBe("warning");
    expect(tightest.over).toBe("active");
    expect(tightest.ratio).toBeCloseTo(1.09, 2);
    // The catalogue prints the number this suite measures, so a palette edit
    // moves the sentence instead of leaving a stale claim.
    expect(
      readFileSync(
        new URL("../../../docs/tokens.md", import.meta.url),
        "utf8",
      ).replace(/\s+/g, " "),
    ).toContain(`at ${tightest.ratio?.toFixed(2)}:1`);
  });

  it("measures a soft badge's edge on every wash a row tints under it", () => {
    // A tone badge is the one status surface painted inside a row rather than on
    // a page: the List example's status column puts one in the row's `trailing`
    // slot, and the row tints `accent` under the pointer, `active` while pressed
    // and fills `selected` once chosen. On a wash the 30% edge is the whole
    // badge, so it is measured wherever the row can be.
    const missing = statusTones.flatMap((tone) =>
      ["hover", "active", "selected", "accent"]
        .filter((over) => !measured("statusEdge", tone, over))
        .map((over) => `${tone}/${over}`),
    );

    expect(missing).toEqual([]);
  });

  it("reads the painters that put a badge on a wash", () => {
    // The placements above are only real while the recipe keeps its tone edge
    // and the row keeps tinting the four washes: a badge that lost its border, or
    // a row that stopped washing, would leave the pairs measuring a composition
    // the library no longer paints.
    const recipes = readFileSync(
      new URL("../../../packages/tw/src/recipes.ts", import.meta.url),
      "utf8",
    );
    const list = readFileSync(
      new URL("../../../packages/components/src/list.tsx", import.meta.url),
      "utf8",
    );
    const badges = recipes.slice(
      recipes.indexOf("export const BADGE_VARIANTS"),
      recipes.indexOf("export const ALERT_BASE"),
    );
    const edgeLess = statusTones.filter(
      (tone) => !badges.includes(`border border-${tone}/30`),
    );
    const unwashed = ["accent", "active", "selected"].filter(
      (role) => !list.includes(`backgroundColor: theme.colors.${role}`),
    );

    expect({ edgeLess, unwashed }).toEqual({ edgeLess: [], unwashed: [] });
  });

  it("reports a badge edge painted in the wash it sits on", () => {
    // A tone whose edge is its own row wash leaves the pill with no boundary at
    // all — the state a brand reaches by reusing `accent` as a tone.
    const flatActive = {
      colors: { ...lightColors, warning: lightColors.active },
    };

    expect(
      decorativeFailures(flatActive).find(
        ({ surface, role, over }) =>
          surface === "statusEdge" && role === "warning" && over === "active",
      ),
    ).toMatchObject({ ratio: 1, floor: decorativeFloor });
  });

  it("measures the edge the component actually paints", () => {
    // The edge's share is a design value, not a role; if `statusTone` paints a
    // different one the measurement moves to a surface nobody sees.
    statusTones.forEach((tone) => {
      const entry = decorativeSurfaces.find(
        ({ surface, role }) => surface === "statusEdge" && role === tone,
      );

      expect(entry?.alpha, tone).toBe(statusEdgeAlpha);
      expect(statusTone(lightTheme, tone).border).toBe(
        alpha(lightColors[tone], statusEdgeAlpha),
      );
    });
  });

  it("measures every soft status surface on every strip a message sits on", () => {
    // An alert, a toast and a soft badge are painted on the page, in a card, in
    // a popover and in a muted toolbar — the tint is what tells the message
    // apart from the surface behind it, so it is measured on all four.
    const missing = statusTones.flatMap((tone) =>
      ["background", "card", "popover", "muted"]
        .filter((over) => !measured("statusTint", `${tone}Soft`, over))
        .map((over) => `${tone}Soft/${over}`),
    );

    expect(missing).toEqual([]);
  });

  it("reports a soft status surface that matches the strip it tints", () => {
    const broken = {
      colors: { ...lightColors, successSoft: lightColors.muted },
    };

    expect(
      decorativeFailures(broken).find(
        ({ surface, role, over }) =>
          surface === "statusTint" &&
          role === "successSoft" &&
          over === "muted",
      ),
    ).toMatchObject({ ratio: 1, floor: decorativeFloor });
  });

  it("reports the tints the light palettes shipped before this step", () => {
    // Measured on the shipped values: a step-100 success tint in a light muted
    // toolbar and Luna light's step-100 info tint on its own beige page. Both
    // were invisible surfaces that every contract called a pass.
    const beforeBase = {
      colors: { ...lightColors, successSoft: palette.green[100] },
    };
    const beforeLuna = {
      colors: {
        ...retroTheme(lightTheme, "luna").colors,
        infoSoft: palette.blue[100],
      },
    };

    expect(
      decorativeFailures(beforeBase).find(
        ({ surface, role, over }) =>
          surface === "statusTint" &&
          role === "successSoft" &&
          over === "muted",
      )?.ratio,
    ).toBeCloseTo(1.006, 2);
    expect(
      decorativeFailures(beforeLuna).find(
        ({ surface, role, over }) =>
          surface === "statusTint" &&
          role === "infoSoft" &&
          over === "background",
      )?.ratio,
    ).toBeCloseTo(1, 2);
  });

  it("measures a scrollbar on every surface a scroller can sit on", () => {
    const missing = ["background", "card", "popover", "muted"].filter(
      (over) => !measured("scrollbar", "scrollbar", over),
    );

    expect(missing).toEqual([]);
  });

  it("measures every state wash on every strip it tints", () => {
    // A component paints a row's hover, press, selection or accent tint on the
    // page, in a card, in a popover and in a muted toolbar — so each role is
    // measured on all four rather than on one and assumed for the rest.
    const missing = ["hover", "active", "selected", "accent"].flatMap((role) =>
      ["background", "card", "popover", "muted"]
        .filter((over) => !measured("stateWash", role, over))
        .map((over) => `${role}/${over}`),
    );

    expect(missing).toEqual([]);
  });

  it("reports a hover that matches the row it tints", () => {
    // The shipped defect: the base dark theme's hover was its popover value, so
    // a hovered menu row painted the surface it already sat on.
    const broken = { colors: { ...lightColors, hover: lightColors.muted } };

    expect(
      decorativeFailures(broken).find(
        ({ surface, role, over }) =>
          surface === "stateWash" && role === "hover" && over === "muted",
      ),
    ).toMatchObject({ ratio: 1, floor: decorativeFloor });
  });

  it("reports a scrollbar thumb that matches the strip it moves along", () => {
    const broken = {
      colors: { ...lightColors, scrollbar: lightColors.background },
    };

    expect(
      decorativeFailures(broken).find(
        ({ surface, over }) => surface === "scrollbar" && over === "background",
      ),
    ).toMatchObject({ role: "scrollbar", ratio: 1, floor: decorativeFloor });
  });

  it("measures the tonal action's fill on every strip it sits on", () => {
    // A secondary button paints no border, so its fill is the whole control: a
    // fill that matches the toolbar it lives in leaves a label with no button
    // around it. A toolbar, a card, a popover and the page all hold one.
    const missing = ["background", "card", "popover", "muted"].filter(
      (over) => !measured("filledAction", "secondary", over),
    );

    expect(missing).toEqual([]);
  });

  it("measures a disabled face against every available face it replaces", () => {
    // A disabled control does not sit on a strip, it replaces the control: the
    // comparison is face against face. An unavailable action that wears the same
    // fill as the enabled one beside it tells the reader it can be pressed.
    const missing: ReadonlyArray<string> = [
      "primary",
      "secondary",
      "destructive",
      "accent",
      "input",
    ].filter((over) => !measured("disabledFace", "disabled", over));

    expect(missing).toEqual([]);
  });

  it("reports a disabled action painted in the enabled action's face", () => {
    // The shipped defect: both high-contrast themes carried `disabled` equal to
    // `secondary`, so the one variant a reader selects for clarity painted an
    // unavailable action and an available tonal action as the same box.
    const broken = {
      colors: {
        ...highContrastLightColors,
        disabled: highContrastLightColors.secondary,
      },
    };

    expect(
      decorativeFailures(broken).find(
        ({ surface, role, over }) =>
          surface === "disabledFace" &&
          role === "disabled" &&
          over === "secondary",
      ),
    ).toMatchObject({ ratio: 1, floor: decorativeFloor });
  });

  it("reports the high-contrast faces that collided before the split", () => {
    // Measured on the shipped values: both variants painted `disabled` and
    // `secondary` in the same colour, and high-contrast light's disabled face
    // was also 1.03:1 from the accent a checked toggle wears.
    const beforeLight = {
      colors: { ...highContrastLightColors, disabled: "#E8E8E8" },
    };
    const beforeDark = {
      colors: { ...highContrastDarkColors, disabled: "#2E2E2E" },
    };

    expect(
      decorativeFailures(beforeLight)
        .filter(({ surface }) => surface === "disabledFace")
        .map(({ over, ratio }) => [over, ratio]),
    ).toMatchObject([
      ["secondary", 1],
      ["accent", 1.0324046406832623],
    ]);
    expect(
      decorativeFailures(beforeDark).find(
        ({ surface, over }) =>
          surface === "disabledFace" && over === "secondary",
      )?.ratio,
    ).toBe(1);
    expect(decorativeFailures(highContrastLightTheme)).toEqual([]);
    expect(decorativeFailures(highContrastDarkTheme)).toEqual([]);
  });

  it("reports a filled action that matches the strip it sits on", () => {
    // The shipped defect: the base light theme's `secondary` was its `muted`
    // value, and `secondary` paints `border-0`, so a secondary button in a
    // muted toolbar had no edge, no fill difference and no hover until pressed.
    const broken = {
      colors: { ...lightColors, secondary: lightColors.muted },
    };

    expect(
      decorativeFailures(broken).find(
        ({ surface, role, over }) =>
          surface === "filledAction" &&
          role === "secondary" &&
          over === "muted",
      ),
    ).toMatchObject({ ratio: 1, floor: decorativeFloor });
  });

  it("measures the deepest elevation level on every strip a raised surface floats over", () => {
    // A dialog lands on the page, a popover on a card or the page, a menu in a
    // toolbar and a context menu over the row it was opened from; the shadow is
    // the only thing separating a raised surface from the strip in a dark theme,
    // so all five are measured.
    const missing = [
      "background",
      "card",
      "popover",
      "muted",
      "selected",
    ].filter((over) => !measured("elevation", "shadow", over));

    expect(missing).toEqual([]);
  });

  it("reads the level's painted colour, not the role it is tinted from", () => {
    // A level supplied to `extendTheme` replaces the array whole, colours and
    // all. The theme's `shadow` role stays paintable and every other surface
    // passes, so only a contract that reads the level can see the flat dialog.
    const flat = extendTheme(lightTheme, {
      elevation: {
        lg: [
          {
            offsetX: 0,
            offsetY: 16,
            blurRadius: 40,
            spreadRadius: -8,
            color: "#00000000",
          },
        ],
      },
    });

    expect(
      decorativeFailures(flat)
        .filter(({ surface }) => surface === "elevation")
        .map(({ over, ratio }) => [over, ratio]),
    ).toEqual([
      ["background", 1],
      ["card", 1],
      ["popover", 1],
      ["muted", 1],
      ["selected", 1],
    ]);
    expect(decorativeFailures(lightTheme)).toEqual([]);
  });

  it("reports a shadow tinted with the row it falls on", () => {
    // A context menu is opened over the row the reader right-clicked, so that
    // row's fill is the strip its shadow lands on. A tint carrying the row's own
    // colour darkens nothing there, and every page placement still passes.
    const broken = extendTheme(lightTheme, {
      colors: { shadow: lightTheme.colors.selected },
    });

    expect(
      decorativeFailures(broken).find(
        ({ surface, over }) => surface === "elevation" && over === "selected",
      ),
    ).toMatchObject({ ratio: 1, floor: decorativeFloor });
  });

  it("prints the deepest level's range over the strips it measures", () => {
    // The page prints the high-contrast dark range, so the sentence moves with
    // the table: a placement added to the elevation half has to appear in it.
    const level = highContrastDarkTheme.elevation.lg[0]?.color ?? "";
    const ratios = decorativeSurfaces
      .filter(({ surface }) => surface === "elevation")
      .map(({ over }) => {
        const strip = highContrastDarkTheme.colors[over];
        return contrastRatio(blend(strip, level, alphaOf(level)), strip);
      })
      .filter((ratio): ratio is number => ratio !== undefined);
    const [low, high] = ratios.reduce<readonly [number, number]>(
      ([floor, ceiling], ratio) => [
        Math.min(floor, ratio),
        Math.max(ceiling, ratio),
      ],
      [Number.POSITIVE_INFINITY, 0],
    );
    const printed = `${low.toFixed(2)}–${high.toFixed(2)}:1`;
    const read = (path: string): string =>
      readFileSync(new URL(path, import.meta.url), "utf8");

    expect(printed).toBe("1.09–1.37:1");
    expect(read("../../../docs/tokens.md")).toContain(printed);
    expect(read("../../../docs/design-system.md")).toContain(printed);
  });

  it("reports the high-contrast dark page no level could lift", () => {
    // The shipped defect: the high-contrast dark theme tinted its shadows with
    // black on a pure-black page, so every level measured 1.00:1 there and no
    // raised surface had a shadow on the page. Its card, popover and toolbar are
    // lifted greys, so only the page was erased — which is the strip a dialog
    // and a full-width card land on. The tint is the grey its raised controls
    // use now, and the deepest level clears the floor on all five strips.
    const before = extendTheme(highContrastDarkTheme, {
      colors: { shadow: "#000000B3" },
    });

    expect(
      decorativeFailures(before).filter(
        ({ surface }) => surface === "elevation",
      ),
    ).toEqual([
      {
        surface: "elevation",
        role: "shadow",
        over: "background",
        ratio: 1,
        floor: decorativeFloor,
      },
    ]);
    expect(
      decorativeFailures(highContrastDarkTheme).some(
        ({ surface }) => surface === "elevation",
      ),
    ).toBe(false);
  });

  it("reports a shadow painted in the page it falls on", () => {
    // The same defect from a brand: a tint equal to the strip cannot darken it,
    // so every level is flat there no matter how strong its share is. The card,
    // popover and toolbar are reported too — the page-coloured tint lifts them
    // by less than a percent.
    const broken = extendTheme(lightTheme, {
      colors: { shadow: lightTheme.colors.background },
    });

    expect(
      decorativeFailures(broken)
        .filter(({ surface }) => surface === "elevation")
        .map(({ over, ratio }) => [over, ratio]),
    ).toMatchObject([
      ["background", 1],
      ["card", expect.any(Number)],
      ["popover", expect.any(Number)],
      ["muted", expect.any(Number)],
      ["selected", expect.any(Number)],
    ]);
    expect(
      decorativeFailures(broken)
        .filter(({ surface }) => surface === "elevation")
        .every(({ ratio, floor }) => ratio !== undefined && ratio < floor),
    ).toBe(true);
  });

  it("reports an elevation level the theme does not carry as unmeasurable", () => {
    // A theme restored from storage can predate a level; the report names the
    // absence instead of skipping the surface it cannot read.
    const reported = decorativeFailures({
      colors: lightColors,
      elevation: {},
    }).filter(({ surface }) => surface === "elevation");

    expect(reported).toHaveLength(
      decorativeSurfaces.filter(({ surface }) => surface === "elevation")
        .length,
    );
    expect(reported.every(({ ratio }) => ratio === undefined)).toBe(true);
  });

  it("passes every authored look", () => {
    retroNames.forEach((look) => {
      [lightTheme, darkTheme].forEach((base) => {
        const theme = retroTheme(base, look);
        expect(decorativeFailures(theme), theme.name).toEqual([]);
      });
    });
  });

  it("passes every shipped theme", () => {
    shippedThemes.forEach((theme) => {
      expect(decorativeFailures(theme), theme.name).toEqual([]);
    });
  });

  it("passes every platform style in both modes", () => {
    platformThemes.forEach((theme) => {
      expect(decorativeFailures(theme), theme.name).toEqual([]);
    });
  });

  it("reports the platform placeholders that matched their own dialog before this step", () => {
    // Measured on the tree before the move: macOS dark's inherited skeleton was
    // 1.049:1 from its popover, Linux dark's 1.031:1 and Windows dark's
    // 1.039:1 — a loading dialog in any of them was an empty surface.
    const before = [
      ["darwin", "#2A303B", 1.049],
      ["linux", "#3A3A3A", 1.031],
      ["win32", "#2A303B", 1.039],
    ] as const;

    before.forEach(([platform, skeleton, ratio]) => {
      const stale = extendTheme(platformTheme(themes.dark, platform), {
        colors: { skeleton },
      });
      const shipped = platformTheme(themes.dark, platform);

      expect(
        contrastRatio(skeleton, stale.colors.popover),
        platform,
      ).toBeCloseTo(ratio, 3);
      expect(platformStyles[platform].colors.dark.skeleton, platform).not.toBe(
        skeleton,
      );
      expect(
        contrastRatio(shipped.colors.skeleton, shipped.colors.popover),
        platform,
      ).toBeGreaterThanOrEqual(decorativeFloor);
      expect(decorativeFailures(shipped), platform).toEqual([]);
    });
  });

  it("prints the tightest placeholder placement over every shipped style", () => {
    const strips = decorativeSurfaces.filter(
      ({ surface }) => surface === "skeleton",
    );
    const looks = retroNames.flatMap((look) => [
      retroTheme(lightTheme, look),
      retroTheme(darkTheme, look),
    ]);
    const tightest = [...shippedThemes, ...platformThemes, ...looks]
      .flatMap((theme) =>
        strips.map(({ over, role }) => ({
          theme: theme.name,
          over,
          ratio: contrastRatio(theme.colors[role], theme.colors[over]),
        })),
      )
      .reduce((worst, placement) =>
        placement.ratio !== undefined &&
        (worst.ratio === undefined || placement.ratio < worst.ratio)
          ? placement
          : worst,
      );

    expect(tightest.theme).toBe("Dark · Windows XP (Luna)");
    expect(tightest.over).toBe("popover");
    expect(tightest.ratio).toBeCloseTo(1.054, 3);
    expect(
      readFileSync(new URL("../../../docs/tokens.md", import.meta.url), "utf8"),
    ).toContain("placeholder on its dialog fill at 1.054:1");
  });
});

describe("decorativeFailures", () => {
  it("reports a divider that matches the page it rules", () => {
    const broken = {
      colors: { ...lightColors, border: lightColors.background },
    };

    expect(decorativeFailures(broken)).toContainEqual({
      surface: "divider",
      role: "border",
      over: "background",
      ratio: 1,
      floor: decorativeFloor,
    });
  });

  it("reports a skeleton that disappears into the card it stands in", () => {
    const broken = { colors: { ...lightColors, skeleton: lightColors.card } };

    expect(
      decorativeFailures(broken).find(
        ({ surface, over }) => surface === "skeleton" && over === "card",
      ),
    ).toMatchObject({ ratio: 1, floor: decorativeFloor });
  });

  it("reports a status edge that matches the tint it bounds", () => {
    // A message whose edge is its own fill has no boundary left; the text still
    // carries the meaning, but the shape is gone.
    const broken = { colors: { ...lightColors, info: lightColors.infoSoft } };

    expect(
      decorativeFailures(broken).find(
        ({ surface, over }) => surface === "statusEdge" && over === "infoSoft",
      ),
    ).toMatchObject({ role: "info", ratio: 1, floor: decorativeFloor });
  });

  it("composites the veil instead of reporting it unmeasurable", () => {
    // `contrastRatio` refuses a translucent colour. The veil is translucent in
    // every theme by design, so the contract must measure the painted result;
    // otherwise the one surface a modal depends on would never be checked.
    expect(
      decorativeFailures(lightTheme).some(({ surface }) => surface === "scrim"),
    ).toBe(false);
    const broken = { colors: { ...lightColors, overlay: "#00000000" } };

    expect(
      decorativeFailures(broken).find(({ surface }) => surface === "scrim"),
    ).toMatchObject({ ratio: 1, floor: decorativeFloor });
  });

  it("reports a surface it cannot measure rather than skipping it", () => {
    // A translucent page cannot be compared with what is painted on it; an
    // unverifiable surface is a failure, not a pass.
    const broken = {
      colors: { ...lightColors, background: "#F6F8FA80" },
    };

    expect(
      decorativeFailures(broken).find(
        ({ surface, over }) => surface === "divider" && over === "background",
      )?.ratio,
    ).toBeUndefined();
  });

  it("takes a floor, so a stricter brand can run the check it needs", () => {
    expect(decorativeFailures(lightTheme, 1)).toEqual([]);
    // Every role placement plus every derived pointer state: an impossible
    // floor has to fail all of them, or a placement is being skipped.
    expect(decorativeFailures(lightTheme, 21).length).toBe(
      decorativeSurfaces.length + actionFeedbackPlacements.length,
    );
  });
});

describe("the documented example", () => {
  it("passes the shipped theme and reports the brand that erased its card edge", () => {
    expect(decorativeSurfacesAreVisible(lightTheme)).toBe(true);
    expect(decorativeSurfacesAreVisible(edgeLessBrand)).toBe(false);
    expect(report(edgeLessBrand)).toContain("divider: border on card is 1.00");
    expect(report(lightTheme)).toEqual([]);
  });

  it("reports the brand whose tonal action is its toolbar", () => {
    expect(decorativeSurfacesAreVisible(flatActionBrand)).toBe(false);
    expect(report(flatActionBrand)).toContain(
      "filledAction: secondary on muted is 1.00",
    );
  });

  it("reports the brand whose shadows are its page", () => {
    expect(decorativeSurfacesAreVisible(flatShadowBrand)).toBe(false);
    expect(report(flatShadowBrand)).toContain(
      "elevation: shadow on background is 1.00",
    );
  });

  it("reports the brand whose unavailable action wears the enabled one's face", () => {
    expect(decorativeSurfacesAreVisible(unavailableActionBrand)).toBe(false);
    expect(report(unavailableActionBrand)).toContain(
      "disabledFace: disabled on secondary is 1.00",
    );
  });

  it("reports the brand whose loading dialog has no placeholder", () => {
    expect(decorativeSurfacesAreVisible(flatSkeletonBrand)).toBe(false);
    expect(report(flatSkeletonBrand)).toContain(
      "skeleton: skeleton on popover is 1.00",
    );
  });
});
