/**
 * Guards `docs/tokens.md` against drift: its colour tables repeat every
 * semantic role for both default and high-contrast themes, so a palette or
 * role edit that is not mirrored in the docs would ship a catalogue that
 * disagrees with the theme. The test parses the documented rows and compares
 * them with the implementation.
 *
 * The numeric tables (typography, spacing, radius, density, component
 * dimensions, elevation, motion, border/icon/avatar sizes) are guarded the
 * other way round: the test builds the documented row from the implementation
 * and requires the markdown to contain it, so a value edit cannot ship a
 * document that lies. The same builder holds
 * the palette ramps — the last hand-written value table — so a ramp edit and a
 * document edit cannot land apart. The design-system assertions include the
 * per-platform mono families and the icon-to-label gap, so the rationale cannot
 * name a family or a spacing value the package does not ship.
 *
 * The figures the catalogue quotes in prose — the status ratios, the soft
 * status edge and the mixture it replaced, the design-system's warning figure
 * and the selection wash percentage — are
 * derived here from `contrastRatio`, `contrastFloors` and the alpha byte
 * (plans 075 and 090), and the `xText` surfaces from `contrastPairs`, so a
 * palette, floor or contract edit cannot leave a sentence quoting the old value.
 *
 * `node:fs` is used deliberately: this is a documentation test over the tree's
 * own files, and the tokens package ships zero runtime dependencies by design.
 *
 * Plan 326 guards a different drift: the page described the contrast contract's
 * own size, and plan 307 grew `inactivePairs` from nine surfaces to thirteen
 * while "the nine-surface inactive list" stayed in the prose, and plan 325 added
 * the invalid field edge while the pair-count history still ended at 262. Both
 * are derived here from `inactiveSurfaces` and `contrastPairs`, so the document
 * cannot state a size the package does not ship.
 *
 * Plan 337 guards the two runtime-reach claims that were one level too broad:
 * `selectionColor` themes text the library paints, not a native `<input>`, and
 * the `placeholder` role is a consumer-rendered hint. The pinned editor paints
 * its own fixed placeholder and wash and reads only `theme.caret`; these cases
 * hold both documents and the `selectionStyle` JSDoc to that evidence.
 *
 * Plan 351 guards the last hand-written description of the contract's size: the
 * design-system's accessibility floor table. Its exact-row assertions held the
 * wording but not the content, so the `track` pairs (plan 347), the combobox
 * check on a highlighted row (plan 341) and the Toast's tone on its card (plan
 * 348) shipped with no row. The mark, track and Toast rows are now built from
 * the contract lists, and every `ContrastPairClass` needs a row. Plan 352 makes
 * the boundary row content-derived too: the `borderStrong` clause must name
 * every surface that role is paired with, including the canvas, a card and the
 * `input` fill the first cut omitted.
 *
 * Plan 354 guards the page's last hand-written list, the interaction-state
 * table: the link row had dropped the four soft status fills plan 346 added, the
 * loading row named four of eight surfaces and the focus row named none. Every
 * state row now names its roles, and each case derives its surfaces from the
 * pair list that enforces them.
 *
 * Plan 371 guards the format half of the editable-theme guarantee: the page
 * teaches that a copied theme can change any role, and `shadow` is read by
 * `alpha()` rather than by a contrast pair, so an unparseable tint made every
 * elevation level fully opaque while the two older checks returned `[]`. The
 * page now names `isHexColor`, `themeColorFailures` and `ColorFailure`, and the
 * design-system's invalid-colour row names the check that holds it.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  alpha,
  colorRoles,
  darkColors,
  palette,
  type ThemeColors,
} from "./color.js";
import {
  compositeOver,
  contrastFloors,
  contrastPairs,
  contrastRatio,
  inactivePairs,
  inactiveSurfaces,
  markPairs,
  overlaySurfaces,
  selectionSurfaces,
  softBorderSurfacePairs,
  stateFillRoles,
  stateFillSurfacePairs,
  stateFillSurfaces,
  toastTonePairs,
  trackMarkPairs,
  trackSurfacePairs,
  type ContrastPairClass,
} from "./contrast.js";
import {
  elevationShadow,
  type BoxShadow,
  type ElevationLevel,
} from "./elevation.js";
import * as Tokens from "./index.js";
import { motion } from "./motion.js";
import {
  getPlatformRecipeTheme,
  isPlatformRecipeName,
  platformRecipeNames,
  platformRecipes,
  type PlatformRecipeName,
} from "./platform-recipes.js";
import {
  platformNames,
  platformStyles,
  platformTypes,
  systemUiFont,
  type PlatformName,
} from "./platforms.js";
import {
  avatarSize,
  borderWidth,
  defaultDensity,
  densityPresets,
  dimensions,
  iconSize,
  radius,
  spacing,
} from "./scale.js";
import { statusTones } from "./styles.js";
import {
  getPlatformTheme,
  getTheme,
  highContrastThemes,
  themeModes,
  themes,
  type Theme,
} from "./theme.js";
import {
  codeLadder,
  proseLadder,
  textRoles,
  typography,
} from "./typography.js";

interface DocumentedRole {
  readonly role: string;
  readonly light: string;
  readonly dark: string;
}

const row = /^\| `([A-Za-z]+)` \| `(#[0-9A-F]{6,8})` \| `(#[0-9A-F]{6,8})` \|/;

const documentedRows = (markdown: string): ReadonlyArray<DocumentedRole> =>
  markdown.split("\n").flatMap((line) => {
    const [, role, light, dark] = row.exec(line) ?? [];
    return role === undefined || light === undefined || dark === undefined
      ? []
      : [{ role, light, dark }];
  });

const markdown = readFileSync(
  new URL("../../../docs/tokens.md", import.meta.url),
  "utf8",
);

/**
 * The rationale document wraps its prose, so a claim can straddle a newline.
 * Collapsing runs of whitespace lets each assertion be the sentence a reader
 * sees rather than a column-limited fragment.
 */
const designSystemSource = readFileSync(
  new URL("../../../docs/design-system.md", import.meta.url),
  "utf8",
);

const designSystem = designSystemSource.replace(/\s+/g, " ");

/** The table row that starts with `label`, or a failure naming it. */
const tableRow = (label: string): string => {
  const line = designSystemSource
    .split("\n")
    .find((candidate) => candidate.startsWith(`| ${label}`));
  expect(line, label).toBeDefined();
  return line ?? "";
};

const documented = documentedRows(markdown);

/** The catalogue's prose, collapsed so a wrapped sentence can be matched. */
const markdownProse = markdown.replace(/\s+/g, " ");

/** The alpha a role carries, as the whole percentage the catalogue quotes. */
const washPercent = (color: string): number =>
  Math.round((Number.parseInt(color.slice(7, 9), 16) / 255) * 100);

const expected = colorRoles.map((role) => ({
  role,
  light: themes.light.colors[role],
  dark: themes.dark.colors[role],
  hcLight: highContrastThemes.light.colors[role],
  hcDark: highContrastThemes.dark.colors[role],
}));

const defaults = expected.map(({ role, light, dark }) => ({
  role,
  light,
  dark,
}));
const highContrast = expected.map(({ role, hcLight, hcDark }) => ({
  role,
  light: hcLight,
  dark: hcDark,
}));

describe("docs/tokens.md", () => {
  it("has a non-empty default and high-contrast table", () => {
    expect(documented).toHaveLength(colorRoles.length * 2);
  });

  it("lists every colour role once per table, in role order", () => {
    expect(documented.slice(0, colorRoles.length)).toEqual(defaults);
    expect(documented.slice(colorRoles.length)).toEqual(highContrast);
  });

  it("states the role count the implementation ships", () => {
    expect(markdown).toContain(`There are ${colorRoles.length} roles.`);
    expect(markdown).toContain(`the same ${colorRoles.length} roles`);
  });
});

const countWords = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
] as const;

const countWord = (count: number): string => countWords[count] ?? String(count);

describe("docs/tokens.md contract counts", () => {
  it("states the surface counts of the nested pair lists", () => {
    const prose = markdown.replace(/\s+/g, " ");

    expect(inactivePairs).toHaveLength(inactiveSurfaces.length);
    expect(prose).toContain(
      `on all ${countWord(selectionSurfaces.length)} surfaces`,
    );
    expect(prose).toContain(
      `the ${countWord(inactiveSurfaces.length)}-surface inactive list`,
    );
    expect(prose).not.toContain("nine-surface inactive list");
    expect(prose).toContain(
      "`inactivePairs` measures `disabledForeground` on its own fill, the plain surfaces, the four row washes and the four soft status fills",
    );
    expect(prose).toContain(
      `the ${countWord(softBorderSurfacePairs.length / statusTones.length)}-surface chip edge`,
    );
  });

  it("ends the pair-count history at the contract's shipped size", () => {
    const prose = markdown.replace(/\s+/g, " ");
    expect(prose).toContain(
      `taking it from 337 to **${contrastPairs.length}**`,
    );
  });

  it("names the audit series through the latest plan", () => {
    const prose = markdown.replace(/\s+/g, " ");
    expect(prose).toContain("plans `076`–`348` closed");
  });
});

/**
 * Plan 376: the design-system's elevation paragraph is the page's rationale for
 * the scrim and the elevation shape, and nothing read it. Plan 375 grew
 * `overlaySurfaces` from six to fourteen and updated the §9 table and
 * explanation, leaving §7 saying "the six surfaces it covers" — the same page
 * stating two counts. The paragraph also called a level "exactly one shadow"
 * while `Elevation` is a list `elevationShadows` resolves, and called the
 * pointer washes "the one exclusion" though the filled families' hover and
 * press steps are excluded too. These cases slice the paragraph and hold it to
 * the contract, so the next scrim surface cannot ship with a stale rationale.
 */
describe("docs/design-system.md elevation paragraph", () => {
  const paragraph = (start: string, end: string): string => {
    const from = designSystem.indexOf(start);
    const to = designSystem.indexOf(end, from);
    expect(from, start).toBeGreaterThanOrEqual(0);
    expect(to, end).toBeGreaterThan(from);
    return designSystem.slice(from, to);
  };

  it("names every surface the modal scrim covers", () => {
    const scrim = paragraph("The scrim is held", "darker backdrop.");
    expect(scrim).toContain(
      `the ${countWord(overlaySurfaces.length)} surfaces it covers`,
    );
    expect(scrim).not.toContain("six surfaces");
    overlaySurfaces.forEach((surface) => {
      expect(scrim, surface).toContain(`\`${surface}\``);
    });
  });

  it("describes a level as the list the helpers read", () => {
    const elevation = paragraph(
      "Elevation is a semantic level",
      "Motion is a scale beside elevation",
    );
    expect(elevation).toContain("`elevationShadows`");
    expect(elevation).toContain("at most one entry");
    expect(elevation).not.toContain("exactly one shadow");
  });
});

const elevationLevels: readonly ElevationLevel[] = [
  "sm",
  "md",
  "lg",
  "overlay",
];

const documentedShadow = (shadow: BoxShadow | undefined): string =>
  shadow === undefined
    ? "`[]`"
    : `\`${shadow.offsetX} ${shadow.offsetY} ${shadow.blurRadius} ${shadow.spreadRadius} ${shadow.color}\``;

describe("docs/tokens.md numeric tables", () => {
  it("lists every type role with its size, leading and weight", () => {
    textRoles.forEach((role) => {
      const style = typography[role];
      expect(markdown, `typography.${role}`).toContain(
        `| \`${role}\` | ${style.fontSize} | ${style.lineHeight} | ${style.fontWeight} |`,
      );
    });
  });

  it("lists the type roles in index order", () => {
    const positions = textRoles.map((role) =>
      markdown.indexOf(`| \`${role}\` |`),
    );
    expect(positions).not.toContain(-1);
    expect(positions).toEqual(positions.toSorted((a, b) => a - b));
  });

  it("lists every spacing step", () => {
    Object.entries(spacing).forEach(([token, pixels]) => {
      expect(markdown, `spacing.${token}`).toContain(
        `| \`${token}\` | ${pixels} |`,
      );
    });
  });

  it("lists every radius step", () => {
    Object.entries(radius).forEach(([token, pixels]) => {
      expect(markdown, `radius.${token}`).toContain(
        `| \`${token}\` | ${pixels} |`,
      );
    });
  });

  it("lists every density preset at its real metrics", () => {
    Object.values(densityPresets).forEach((preset) => {
      const label =
        preset.name === defaultDensity.name
          ? `\`${preset.name}\` (default)`
          : `\`${preset.name}\``;
      const height = preset.controlHeight;
      const padding = preset.controlPaddingX;
      expect(markdown, `density.${preset.name}`).toContain(
        `| ${label} | ${height.sm} / ${height.md} / ${height.lg} | ${padding.sm} / ${padding.md} / ${padding.lg} | ${preset.rowHeight} |`,
      );
    });
  });

  it("lists every elevation level with both modes' shadow", () => {
    elevationLevels.forEach((level) => {
      expect(markdown, `elevation.${level}`).toContain(
        `| \`${level}\` | ${documentedShadow(elevationShadow(themes.light, level))} | ${documentedShadow(elevationShadow(themes.dark, level))} |`,
      );
    });
  });

  it("names the tint role elevation is composed from", () => {
    expect(markdown).toContain("`colors.shadow`");
    expect(markdown).toContain("`elevationShadows`");
  });

  it("governs a defined elevation level, overlay included", () => {
    const prose = markdown.replace(/\s+/g, " ");
    expect(prose).toContain(
      "a level a consumer defines, `overlay` included, is held to the same rules",
    );
  });

  it("lists every motion level in milliseconds", () => {
    Object.entries(motion).forEach(([level, value]) => {
      if (typeof value !== "number") {
        return;
      }
      expect(markdown, `motion.${level}`).toContain(
        `| \`${level}\` | ${value} |`,
      );
    });
  });

  it("lists every border, icon and avatar size", () => {
    Object.entries(borderWidth).forEach(([size, pixels]) => {
      expect(markdown, `borderWidth.${size}`).toContain(
        `| \`borderWidth.${size}\` | ${pixels} |`,
      );
    });
    Object.entries(iconSize).forEach(([size, pixels]) => {
      expect(markdown, `iconSize.${size}`).toContain(
        `| \`iconSize.${size}\` | ${pixels} |`,
      );
    });
    Object.entries(avatarSize).forEach(([size, pixels]) => {
      expect(markdown, `avatarSize.${size}`).toContain(
        `| \`avatarSize.${size}\` | ${pixels} |`,
      );
    });
  });

  it("lists every component dimension", () => {
    Object.entries(dimensions).forEach(([token, pixels]) => {
      expect(markdown, `dimensions.${token}`).toContain(
        `| \`dimensions.${token}\` | ${pixels} |`,
      );
    });
  });
});

describe("docs/tokens.md palette table", () => {
  it("lists every ramp and step at its real value", () => {
    Object.entries(palette).forEach(([ramp, steps]) => {
      const row = Object.entries(steps)
        .map(([step, hex]) => `${step} \`${hex}\``)
        .join(" · ");
      expect(markdown, `palette.${ramp}`).toContain(`| \`${ramp}\` | ${row} |`);
    });
  });

  it("lists the ramps in declaration order", () => {
    const positions = Object.keys(palette).map((ramp) =>
      markdown.indexOf(`| \`${ramp}\` |`),
    );
    expect(positions).not.toContain(-1);
    expect(positions).toEqual(positions.toSorted((a, b) => a - b));
  });
});

describe("docs/tokens.md platform table", () => {
  it("lists every shipped platform variant", () => {
    platformNames.forEach((platform) => {
      expect(markdown, platform).toContain(
        `| \`${platform}\` (${platformTypes[platform].label}) |`,
      );
    });
  });

  it("lists the variants in toggle order", () => {
    const positions = platformNames.map((platform) =>
      markdown.indexOf(`| \`${platform}\` (`),
    );
    expect(positions).not.toContain(-1);
    expect(positions).toEqual(positions.toSorted((a, b) => a - b));
  });

  it("states each variant's real type, shape, density and accent", () => {
    platformNames.forEach((platform) => {
      const style = platformStyles[platform];
      const variantRadius = style.structure.radius ?? radius;
      const density = style.structure.density ?? defaultDensity.name;
      const light = style.colors.light.primary ?? themes.light.colors.primary;
      const dark = style.colors.dark.primary ?? themes.dark.colors.primary;
      expect(markdown, platform).toContain(
        `| \`${platform}\` (${platformTypes[platform].label}) | \`${systemUiFont}\` | \`${platformTypes[platform].mono}\` | ${variantRadius.sm} / ${variantRadius.md} / ${variantRadius.lg} / ${variantRadius.xl} | \`${density}\` | \`${light}\` | \`${dark}\` |`,
      );
    });
  });
});

describe("docs/tokens.md platform recipes", () => {
  it("lists every recipe in documented order", () => {
    const positions = platformRecipeNames.map((recipe) =>
      markdown.indexOf(`| \`${recipe}\` (`),
    );
    expect(positions).not.toContain(-1);
    expect(positions).toEqual(positions.toSorted((a, b) => a - b));
  });

  it("states each recipe's real canvas, accent, selection, shape and density", () => {
    platformRecipeNames.forEach((recipe) => {
      const style = platformRecipes[recipe];
      const colors = style.colors.light;
      const shape = style.structure.radius ?? radius;
      const density = style.structure.density ?? defaultDensity.name;
      expect(markdown, recipe).toContain(
        `| \`${recipe}\` (${style.types.label}) | \`${colors.background}\` | \`${colors.primary}\` | \`${colors.selected}\` | ${shape.sm} / ${shape.md} / ${shape.lg} / ${shape.xl} | \`${density}\` | \`${style.types.mono}\` |`,
      );
    });
  });

  it("keeps a recipe out of the platform axis and documents the resolver", () => {
    platformRecipeNames.forEach((recipe) => {
      expect(platformNames).not.toContain(recipe);
      expect(isPlatformRecipeName(recipe)).toBe(true);
    });
    expect(markdown).toContain(
      "A recipe is an **edition of a platform**, not a fifth platform",
    );
    expect(markdown).toContain(
      "`getPlatformRecipeTheme(recipe, mode, contrast?)`",
    );
  });
});

describe("docs/tokens.md authored platform style", () => {
  // Plan 330: the executed example moved `accent` but inherited the identity
  // iris hover and press, and the page said only that it names the primary
  // family — so the defect it shipped was not described anywhere.
  it("states that the authored style moves both filled families", () => {
    expect(markdown).toContain(
      "and the whole accent family — fill, foreground, hover",
    );
    expect(markdown).toContain(
      "A style that moves `accent` but not its states inherits the base hue's",
    );
  });

  // Plan 331: the wash stayed the identity iris while the accent and selected
  // surfaces moved to Contoso blue, and the page did not say the wash follows.
  it("states that the selection wash follows the accent", () => {
    expect(markdown).toContain(
      "drag-selection wash follows the accent too: `selection` is the accent at the",
    );
  });
});

describe("docs/tokens.md status table", () => {
  it("lists every tone with its solid, soft and text roles", () => {
    statusTones.forEach((tone) => {
      expect(markdown, tone).toContain(
        `| \`${tone}\` | \`${tone}\` / \`${tone}Foreground\` | \`${tone}Soft\` | \`${tone}SoftForeground\` | \`${tone}SoftBorder\` | \`${tone}Text\` |`,
      );
    });
  });

  it("lists the tones in documentation order", () => {
    const positions = statusTones.map((tone) =>
      markdown.indexOf(`| \`${tone}\` | \`${tone}\` / \`${tone}Foreground\` |`),
    );
    expect(positions).not.toContain(-1);
    expect(positions).toEqual(positions.toSorted((a, b) => a - b));
  });

  it("names every surface the contract checks status text on, in both tables", () => {
    statusTones.forEach((tone) => {
      const surfaces = contrastPairs
        .filter(([foreground]) => foreground === `${tone}Text`)
        .map(([, background]) => `\`${background}\``);
      const rows = markdown
        .split("\n")
        .filter((line) => line.startsWith(`| \`${tone}Text\` |`));

      expect(surfaces.length, tone).toBe(8);
      expect(rows.length, tone).toBe(2);
      rows.forEach((tableRow) =>
        surfaces.forEach((surface) =>
          expect(tableRow, `${tone}Text on ${surface}`).toContain(surface),
        ),
      );
    });
  });
});

describe("docs/tokens.md quoted figures", () => {
  it("quotes the status ratios the light palette produces", () => {
    const light = themes.light.colors;
    const sentence =
      "The solid roles are fills, not foregrounds. " +
      `Light \`warning\` (\`${light.warning}\`) is ` +
      `${contrastRatio(light.warning, light.background).toFixed(2)}:1 against \`background\` and ` +
      `${contrastRatio(light.warning, light.card).toFixed(2)}:1 against \`card\`, under the ` +
      `${contrastFloors.default.boundary}:1 non-text floor, and light \`success\` is ` +
      `${contrastRatio(light.success, light.background).toFixed(2)}:1, under the ` +
      `${contrastFloors.default.secondary}:1 text floor.`;

    expect(markdownProse).toContain(sentence);
  });

  it("states the soft edge floor in the catalogue", () => {
    const sentence =
      "measured on the fill it borders and on the eight surfaces a chip sits on " +
      "(`background`, `card`, `popover`, the `muted` panel and the `hover`, `active`, " +
      "`accent` and `selected` washes) at the divider floor: " +
      `${contrastFloors.default.divider}:1 in the default themes and ` +
      `${contrastFloors.high.divider}:1 at high contrast.`;

    expect(markdownProse).toContain(sentence);
  });

  it("quotes the high-contrast soft edge and the mixture it replaced", () => {
    const high = highContrastThemes.light.colors;
    const mixed = compositeOver(alpha(high.warning, 0.3), high.warningSoft);
    const sentence =
      "At high contrast the edge is designed, not mixed: " +
      `\`warningSoftBorder\` (\`${high.warningSoftBorder}\`) is ` +
      `${contrastRatio(high.warningSoftBorder, high.warningSoft).toFixed(2)}:1 on ` +
      `\`warningSoft\`, where the 30% mixture it replaced measured ` +
      `${contrastRatio(mixed, high.warningSoft).toFixed(2)}:1, under the ` +
      `${contrastFloors.high.divider}:1 divider floor.`;

    expect(markdownProse).toContain(sentence);
  });

  it("quotes the selection wash strength each mode uses", () => {
    const { light, dark } = themes;
    const high = highContrastThemes;

    expect(washPercent(high.dark.colors.selection)).toBe(
      washPercent(high.light.colors.selection),
    );

    const sentence =
      "The wash is translucent (" +
      `${washPercent(light.colors.selection)}% in the light default theme, ` +
      `${washPercent(dark.colors.selection)}% in dark and ` +
      `${washPercent(high.light.colors.selection)}% at high contrast), ` +
      "so selected text keeps the body contrast on every surface a glyph can be " +
      "selected on: `background`, `card`, `muted`, `hover`, `active` and `accent` " +
      "with `foreground`; `popover` with `popoverForeground`; `input` with " +
      "`inputForeground`; and `selected` with `selectedForeground` at the " +
      "secondary floor; a soft status surface carries its own tone with " +
      "`xSoftForeground`, its description with `foreground` and its caption " +
      "with `mutedForeground`.";
    expect(markdownProse).toContain(sentence);

    const secondary =
      "Secondary text is held to the secondary floor through the same wash on " +
      "all nine surfaces (`mutedForeground`), because a row description, a card " +
      "caption or a message timestamp is selected with the body copy around it.";
    expect(markdownProse).toContain(secondary);

    [
      "`selectionSurfaces` is the list of plain surfaces",
      "`selectionPairs` holds their body and secondary text pairs",
      "`selectionWashPairs` holds the wash itself",
      "`selectionSoftPairs` measures all three text roles a status panel carries",
      "`selectionSoftWashPairs` the wash's own perceivability",
    ].forEach((claim) => {
      expect(markdownProse, claim).toContain(claim);
    });
  });

  it("quotes the two selection regressions and the fixes", () => {
    const light = themes.light;
    const washedSuccess = contrastRatio(
      // The pre-091 light success foreground on the fill it inherited then;
      // plan 300 moved that fill, so the historical pair is written out.
      "#0E5135",
      compositeOver(light.colors.selection, "#C2F4D6"),
    );
    const washedDestructive = contrastRatio(
      // The pre-091 Windows dark wash over the fill it inherited then; plan 095
      // moved that fill, so the historical pair is written out.
      compositeOver("#0067C033", "#6B1A1D"),
      "#6B1A1D",
    );
    const sentence =
      "The audit found two gaps: identity light `successSoftForeground` measured " +
      `${washedSuccess.toFixed(2)}:1 through the wash, under the ` +
      `${contrastFloors.default.body}:1 body floor, and Windows dark's wash over ` +
      `\`destructiveSoft\` measured ${washedDestructive.toFixed(3)}:1 — an invisible highlight.`;

    expect(markdownProse).toContain(sentence);
  });

  it("quotes the control boundary regression on the soft status fills", () => {
    const dark = themes.dark.colors;
    // The pre-092 identity dark boundary and the soft fills it painted then
    // (plan 095 moved the success and destructive tints afterwards).
    const previous = "#77808F";
    const previousFills = {
      successSoft: "#0C452D",
      destructiveSoft: "#6B1A1D",
    };
    const sentence =
      "The audit found three: identity dark's `borderStrong` " +
      `(\`${previous}\`) measured ` +
      `${contrastRatio(previous, previousFills.successSoft).toFixed(2)}:1 on \`successSoft\`, ` +
      `${contrastRatio(previous, previousFills.destructiveSoft).toFixed(2)}:1 on \`destructiveSoft\` and ` +
      `${contrastRatio(previous, dark.infoSoft).toFixed(2)}:1 on \`infoSoft\`, under the ` +
      `${contrastFloors.default.boundary}:1 boundary floor, while every other shipped set cleared it. The edge is now ` +
      `\`${dark.borderStrong}\`, which clears the floor on all four soft fills.`;

    expect(markdownProse).toContain(sentence);
  });

  it("quotes the divider regression on the soft status fills", () => {
    const dark = themes.dark.colors;
    // The pre-095 success fill the dark styles inherited.
    const previous = "#0C452D";
    const windows = getPlatformTheme("win32", "dark").colors;
    const linux = getPlatformTheme("linux", "dark").colors;
    const sentence =
      "The audit found four: the inherited `successSoft` " +
      `(\`${previous}\`) measured ` +
      `${contrastRatio(windows.border, previous).toFixed(3)}:1 on Windows dark, ` +
      `${contrastRatio(dark.border, previous).toFixed(3)}:1 on the identity and ` +
      `${contrastRatio(linux.border, previous).toFixed(3)}:1 on Linux dark, and identity dark's ` +
      `\`destructiveSoft\` (\`#6B1A1D\`) ${contrastRatio(dark.border, "#6B1A1D").toFixed(3)}:1, ` +
      `under the ${contrastFloors.default.divider}:1 divider floor. The two soft fills move one step ` +
      "darker and keep the surface floor on every canvas.";

    expect(markdownProse).toContain(sentence);
  });

  it("quotes the skeleton regression the audit found", () => {
    // The pre-094 identity light skeleton, which was the pressed wash.
    const previous = palette.neutral[200];
    const sentence =
      "The audit found the placeholder was the `active` fill in the identity and high-contrast themes, so a pressed loading row erased the placeholder (1.000:1); the light and dark skeleton moved one ramp step away, and each dark platform style carries its own.";

    expect(contrastRatio(previous, themes.light.colors.active)).toBe(1);
    expect(markdownProse).toContain(sentence);
  });

  it("states the wash strength in both colour tables", () => {
    const cell = (light: string, dark: string): string =>
      washPercent(light) === washPercent(dark)
        ? `text selection wash (${washPercent(light)}% alpha; \`selectionColor\`)`
        : `text selection wash (${washPercent(light)}% light, ${washPercent(dark)}% dark; \`selectionColor\`)`;

    expect(markdown).toContain(
      `| \`selection\` | \`${themes.light.colors.selection}\` | \`${themes.dark.colors.selection}\` | ${cell(themes.light.colors.selection, themes.dark.colors.selection)} |`,
    );
    expect(markdown).toContain(
      `| \`selection\` | \`${highContrastThemes.light.colors.selection}\` | \`${highContrastThemes.dark.colors.selection}\` | ${cell(highContrastThemes.light.colors.selection, highContrastThemes.dark.colors.selection)} |`,
    );
  });

  it("quotes the macOS accent's fill and text steps", () => {
    const macos = getPlatformTheme("darwin", "light").colors;
    const sentence =
      `The split is not cosmetic: the macOS accent \`${macos.primary}\` measures ` +
      `${contrastRatio(macos.primary, macos.background).toFixed(2)}:1 on that canvas and ` +
      `${contrastRatio(macos.primary, macos.active).toFixed(2)}:1 on the pressed wash, while ` +
      `its text step \`${macos.primaryText}\` clears both.`;

    expect(markdownProse).toContain(sentence);
  });

  it("quotes the warning figure the design system repeats", () => {
    const light = themes.light.colors;
    const sentence = `The solid roles are fills: light \`warning\` is ${contrastRatio(light.warning, light.background).toFixed(2)}:1 against the canvas, so it is never the colour of text or a dot.`;

    expect(designSystem.includes(sentence), sentence).toBe(true);
  });
});

describe("docs/tokens.md quoted tightest figures", () => {
  const platformLabels: Readonly<Record<PlatformName, string>> = {
    darwin: "macOS",
    linux: "Linux",
    win32: "Windows",
    default: "Default",
  };

  const recipeLabels: Readonly<Record<PlatformRecipeName, string>> = {
    xp: "XP",
    aero: "Aero",
  };

  const quotedSets: ReadonlyArray<readonly [string, Theme]> = [
    ...themeModes.map((mode): readonly [string, Theme] => [
      `identity ${mode}`,
      getTheme(mode),
    ]),
    ...themeModes.flatMap((mode) =>
      platformNames
        .filter((platform) => platform !== "default")
        .map((platform): readonly [string, Theme] => [
          `${platformLabels[platform]} ${mode}`,
          getPlatformTheme(platform, mode),
        ]),
    ),
    ...platformRecipeNames.map((recipe): readonly [string, Theme] => [
      `${recipeLabels[recipe]} light`,
      getPlatformRecipeTheme(recipe, "light"),
    ]),
  ];

  const tightest = (
    foreground: keyof ThemeColors,
    background: keyof ThemeColors,
  ): readonly [string, number] =>
    quotedSets
      .map(
        ([label, theme]) =>
          [
            label,
            contrastRatio(theme.colors[foreground], theme.colors[background]),
          ] as const,
      )
      .reduce((worst, current) => (current[1] < worst[1] ? current : worst));

  it("quotes the row-text and status ratios the shipped themes produce", () => {
    const quoted = [
      ["primaryText", "selected", "Linux dark", 4.53],
      ["foreground", "selected", "Linux dark", 7.47],
      ["popoverForeground", "selected", "Linux dark", 7.95],
      ["selectedForeground", "active", "macOS light", 5.21],
      ["selectedForeground", "accent", "macOS light", 5.81],
      ["successText", "muted", "Aero light", 7.68],
      ["mutedForeground", "destructiveSoft", "Aero light", 6.61],
      ["primaryText", "destructiveSoft", "Windows light", 5.26],
    ] as const;

    quoted.forEach(([foreground, background, label, value]) => {
      const [actualLabel, ratio] = tightest(foreground, background);

      expect(
        [actualLabel, Number(ratio.toFixed(2))],
        `${foreground}/${background}`,
      ).toEqual([label, value]);
      expect(markdownProse).toContain(
        `\`${foreground}\` on \`${background}\` at **${value}:1** (${label})`,
      );
    });
  });
  it("quotes the status label the selection wash can erase", () => {
    const shipped: ReadonlyArray<readonly [string, Theme]> = [
      ...themeModes.flatMap((mode) =>
        (["default", "high"] as const).map(
          (contrast): readonly [string, Theme] => [
            `identity ${mode} ${contrast}`,
            getTheme(mode, contrast),
          ],
        ),
      ),
      ...platformNames
        .filter((platform) => platform !== "default")
        .flatMap((platform) =>
          themeModes.map((mode): readonly [string, Theme] => [
            `${platformLabels[platform]} ${mode}`,
            getPlatformTheme(platform, mode),
          ]),
        ),
      ...platformRecipeNames.map((recipe): readonly [string, Theme] => [
        `${recipeLabels[recipe]} light`,
        getPlatformRecipeTheme(recipe, "light"),
      ]),
    ];
    const tightest = (
      contrast: "default" | "high",
    ): readonly [string, number] => {
      let worst: readonly [string, number] = ["", Number.POSITIVE_INFINITY];
      shipped
        .filter(([, theme]) => theme.contrast === contrast)
        .forEach(([label, theme]) => {
          statusTones.forEach((tone) => {
            selectionSurfaces.forEach((surface) => {
              const ratio = contrastRatio(
                theme.colors[`${tone}Text`],
                compositeOver(theme.colors.selection, theme.colors[surface]),
              );
              if (ratio < worst[1]) {
                worst = [
                  `${label.replace(" default", "")} ${tone}Text on ${surface}`,
                  ratio,
                ];
              }
            });
          });
        });
      return worst;
    };

    const [defaultLabel, defaultRatio] = tightest("default");
    expect([defaultLabel, Number(defaultRatio.toFixed(3))]).toEqual([
      "XP light infoText on active",
      4.661,
    ]);
    const [highLabel, highRatio] = tightest("high");
    expect([highLabel, Number(highRatio.toFixed(3))]).toEqual([
      "identity light high warningText on active",
      7.37,
    ]);

    expect(markdownProse).toContain(
      "**4.661:1** (XP light `infoText` on `active`)",
    );
    expect(markdownProse).toContain(
      "**7.370:1** at AAA (identity light high `warningText` on `active`)",
    );
  });

  it("quotes the weakest field edge the shipped themes produce", () => {
    const [label, ratio] = tightest("border", "input");

    expect([label, Number(ratio.toFixed(2))]).toEqual(["Linux dark", 1.25]);
    expect(markdownProse).toContain(
      `the weakest shipped set is ${label} at **1.25:1**`,
    );
  });

  it("quotes the AAA scrim's strength, value and ratio", () => {
    const scrimTheme = highContrastThemes.dark;
    const scrim = scrimTheme.colors.overlay;
    const painted = compositeOver(scrim, scrimTheme.colors.background);
    const ratio = Number(
      contrastRatio(painted, scrimTheme.colors.background).toFixed(3),
    );
    const percent = Math.round(
      (Number.parseInt(scrim.slice(7), 16) / 255) * 100,
    );

    expect([scrim, percent, ratio]).toEqual(["#FFFFFF26", 15, 1.388]);
    expect(markdownProse).toContain(`\`${scrim}\`, ${ratio}:1`);
    expect(markdownProse).toContain(`${percent}% white wash`);
  });

  it("quotes the worst alpha-hover label ratios plan 338 records", () => {
    const surfaces = ["background", "card", "popover", "muted"] as const;
    const worstAlpha = (
      foreground: keyof ThemeColors,
      fill: keyof ThemeColors,
      opacity: number,
    ): readonly [string, string, number] =>
      quotedSets
        .flatMap(([label, theme]) =>
          surfaces.map(
            (surface) =>
              [
                label,
                surface,
                contrastRatio(
                  theme.colors[foreground],
                  compositeOver(
                    alpha(theme.colors[fill], opacity),
                    theme.colors[surface],
                  ),
                ),
              ] as const,
          ),
        )
        .reduce((worst, current) => (current[2] < worst[2] ? current : worst));

    const quoted = [
      ["primaryForeground", "primary", 0.5, "Linux light", "card", 2.06],
      [
        "destructiveForeground",
        "destructive",
        0.5,
        "identity light",
        "card",
        2.24,
      ],
      ["primaryForeground", "primary", 0.9, "macOS light", "card", 4.02],
      ["primaryForeground", "primary", 0.8, "Linux light", "card", 3.4],
      [
        "destructiveForeground",
        "destructive",
        0.9,
        "identity light",
        "card",
        4.43,
      ],
      [
        "destructiveForeground",
        "destructive",
        0.8,
        "identity light",
        "card",
        3.75,
      ],
    ] as const;

    quoted.forEach(([foreground, fill, opacity, label, surface, value]) => {
      const [actualLabel, actualSurface, ratio] = worstAlpha(
        foreground,
        fill,
        opacity,
      );

      expect(
        [actualLabel, actualSurface, Number(ratio.toFixed(2))],
        `${foreground} at ${opacity}`,
      ).toEqual([label, surface, value]);
      expect(markdownProse).toContain(
        `${value.toFixed(2)}:1** (${label}, ${surface})`,
      );
    });
  });

  it("quotes the weakest value groove and the mark it carries", () => {
    const [surfaceLabel, surfaceRatio] = tightest("track", "selected");
    const [markLabel, markRatio] = tightest("success", "track");

    expect([surfaceLabel, Number(surfaceRatio.toFixed(2))]).toEqual([
      "XP light",
      1.06,
    ]);
    expect([markLabel, Number(markRatio.toFixed(2))]).toEqual([
      "Aero light",
      3.15,
    ]);
    expect(markdownProse).toContain(
      `${surfaceLabel} \`track\` on its \`selected\` fill at **1.06:1**`,
    );
    expect(markdownProse).toContain(
      `${markLabel} \`success\` on the groove at **3.15:1**`,
    );
  });

  it("quotes the invisible track the audit found", () => {
    const identityDark = getTheme("dark");
    const macOSDark = getPlatformTheme("darwin", "dark");

    expect(
      contrastRatio(identityDark.colors.muted, identityDark.colors.popover),
    ).toBe(1);
    expect(contrastRatio(macOSDark.colors.muted, macOSDark.colors.card)).toBe(
      1,
    );
    expect(markdownProse).toContain("all at **1.000:1**");
  });

  it("quotes the ceiling a translucent fill cannot pass", () => {
    const ceiling = contrastRatio(
      "#FFFFFF",
      compositeOver(alpha("#000000", 0.5), "#FFFFFF"),
    ).toFixed(2);

    expect(ceiling).toBe("4.00");
    expect(markdownProse).toContain(
      `carries white text at only **${ceiling}:1**`,
    );
  });
});

describe("docs/tokens.md fill selection", () => {
  it("states the inverse veil for content on a filled action", () => {
    expect(markdownProse).toContain(
      "Content painted on a **filled action** uses `selectionOnFill` instead of `selection`.",
    );
    expect(markdownProse).toContain(
      '`selectionStyle(theme, "fill")` applies it to a subtree',
    );
    ["selectionFillPairs", "selectionFillWashPairs", "selectionOnFill"].forEach(
      (name) => {
        expect(markdown).toContain(name);
      },
    );
  });
});

describe("docs/tokens.md runtime reach", () => {
  it("names the application point for native text selection", () => {
    expect(markdown).toContain("`selectionColor`");
    expect(markdown).toContain("`userSelect`");
  });

  it("records the scrollbar tint the pinned runtime lacks", () => {
    expect(markdown).toContain("`scrollbarColor`");
    expect(markdown).toContain("`scrollbarWidth`");
  });

  it("records the native placeholder and selection the editor paints itself", () => {
    expect(markdownProse).toContain(
      "The editor draws its placeholder in `#8F8F8F` (`rgba(0x8f8f8fff)`)",
    );
    expect(markdownProse).toContain("and its selection in `#7C86FF59`");
    expect(markdownProse).toContain("never reads `textFaint`, `accent`");
    expect(markdownProse).toContain("`@gpuix/native@0.10.0` (`9fcd628`)");
    expect(markdownProse).toContain("**3.23:1** on the identity light `input`");
  });

  it("keeps the native-field limitation in the selectionStyle JSDoc", () => {
    const styles = readFileSync(
      new URL("./styles.ts", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");
    expect(styles).toContain(
      "A native `<input>`/`<textarea>` paints its own fixed wash in GPUix",
    );
    expect(styles).toContain("does not read this property");
  });
});

describe("docs/tokens.md public values", () => {
  it("names every value the package exports", () => {
    // A name counts only as a whole identifier: `motion` inside
    // `motionTransition` does not document the `motion` token.
    const mentions = (name: string): boolean =>
      new RegExp(`(^|[^A-Za-z0-9_$])${name}(?![A-Za-z0-9_$])`).test(markdown);
    expect(Object.keys(Tokens).filter((name) => !mentions(name))).toEqual([]);
  });
});

describe("docs/tokens.md contrast contract", () => {
  it("names the consumer check and the data behind it", () => {
    const mentions = (name: string): boolean =>
      new RegExp(`(^|[^A-Za-z0-9_$])${name}(?![A-Za-z0-9_$])`).test(markdown);
    [
      "themeContrastFailures",
      "contrastRatio",
      "contrastPairs",
      "contrastFloors",
      "compositeOver",
    ].forEach((name) => {
      expect(mentions(name), name).toBe(true);
    });
  });

  it("states the floor table the checker reads", () => {
    const line = (level: keyof typeof contrastFloors): string =>
      `contrastFloors.${level}; // { ${Object.entries(contrastFloors[level])
        .map(([pairClass, floor]) => `${pairClass}: ${floor}`)
        .join(", ")} }`;

    expect(markdown).toContain(line("default"));
    expect(markdown).toContain(line("high"));
  });

  it("states the filled family's step floor", () => {
    expect(markdownProse).toContain(
      "Each filled family also has a **step** floor.",
    );
    expect(markdownProse).toContain(
      "`stateStepPairs` holds `xHover` to 1.05:1 from `x`",
    );
    expect(markdownProse).toContain(
      "`washStepPairs` holds `active` to 1.05:1 from `hover`",
    );
  });

  it("states the mark floor and why a status fill is not a mark", () => {
    expect(markdownProse).toContain(
      "A solid role painted as a **mark** is held to " +
        `${contrastFloors.default.mark}:1 ` +
        `(${contrastFloors.high.mark}:1 at AAA) instead:`,
    );
    expect(markdownProse).toContain(
      "A status indicator is not a mark: the solid `warning` is **1.78:1** on " +
        "the light canvas, so a status dot uses `xText`",
    );
  });
});

describe("docs/tokens.md colour format contract", () => {
  it("names the predicate, the check and the failure type", () => {
    ["isHexColor", "themeColorFailures", "ColorFailure"].forEach((name) => {
      expect(markdown).toContain(name);
    });
  });

  it("states the form and the tint consequence", () => {
    expect(markdownProse).toContain("six- or eight-digit hex");
    expect(markdownProse).toContain('shadow: "black"');
    expect(markdownProse).toContain("fully opaque");
  });

  it("holds the design-system's invalid-colour row to the check", () => {
    const row = tableRow("invalid colour strings are ignored per property");
    expect(row).toContain("themeColorFailures");
    expect(row).toContain("six- or eight-digit hex form");
  });
});

describe("docs/tokens.md theme contract", () => {
  const themeApiBlock =
    /## Theme API\n+```ts\n([\s\S]*?)```/.exec(markdown)?.[1] ?? "";

  const documentedFields = themeApiBlock.split("\n").flatMap((line) => {
    const field = /^ {2}([A-Za-z]+):/.exec(line)?.[1];
    return field === undefined ? [] : [field];
  });

  it("documents every Theme field in the interface's order", () => {
    expect(documentedFields).toEqual(Object.keys(themes.light));
  });

  it("states the argument the checks default to", () => {
    [
      "`themeContrastFailures(theme, contrast = theme.contrast)`",
      "`applyPlatformStyle(base, style, contrast = base.contrast)`",
    ].forEach((signature) => {
      expect(markdown.includes(signature), signature).toBe(true);
    });
  });

  it("states the density merge rule and shows a size-by-size override", () => {
    expect(markdown.replace(/\s+/g, " ")).toContain(
      "`density` accepts a preset name or partial metrics; metrics merge by size, so changing the medium control height keeps the small and large ones, and a partial override keeps the base preset name;",
    );
    expect(markdown).toContain("density: { controlHeight: { md: 34 } }");
  });

  it("states how the builder selects its contrast variant", () => {
    const page = markdown.replace(/\s+/g, " ");

    expect(page).toContain(
      '`createTheme(config)` starts from `getTheme(config.mode, config.contrast ?? "default")`, so `contrast` selects the palette it builds on;',
    );
    expect(page).not.toContain(
      "`createTheme(config)` starts from `themes[config.mode]`",
    );
  });
});

describe("docs/tokens.md contrast surfaces", () => {
  it("names the washes and the floating surface the contract covers", () => {
    const sentence =
      "The focus ring is measured on the eight surfaces a focused control can sit on — the canvas, card and popover, the `muted` panel a sidebar control sits on, the `accent` wash a selectable row paints, and the `hover`, `active` and `selected` washes — because focus and selection co-occur in rows. It is also measured on the four soft status fills, because a Toast's action button is focused while it sits on its own tint; every shipped variant already clears the floor there, so no colour moves, and the pairs exist so an edited theme cannot remove the ring. A field's own `input` fill and a control's `secondary` fill are what the focus shadow surrounds, not what it sits on, so they are not `ringSurfaces`. The ring role has one other job: a pressed field repaints its border with `ring` on its own `input` fill, the way hover repaints it with `borderStrong`, so that control edge is a `boundary` pair (`fieldPressedEdgePairs`, plan `343`). `ringSurfaces` in `src/contrast.ts` is the one list, and `ring-surfaces.test.ts` holds the public check to it. Secondary text is measured on `hover`, `active`, `accent` and `selected`, because a list row, a combobox option and a menu item paint those washes behind a description; status text (`xText`) is measured on `background`, `card`, `popover`, the `muted` panel and those four washes, so a status label or indicator dot in a sidebar, a hovered, pressed or selected row or a dialog is covered; the `borderStrong` boundary is measured on `popover`, the `muted` panel and those four washes, so a checkbox or field in a quiet panel, a hovered, pressed, selectable or selected row still shows its edge. It is also measured on the four soft status fills, because an Alert or Toast carries actions — a field, a don't-show-again checkbox — whose edge must stay visible.";
    expect(markdown.replace(/\s+/g, " ")).toContain(sentence);
  });

  it("states the invalid field edge and the surfaces it is painted on", () => {
    const pairs = contrastPairs
      .filter(
        ([foreground, background, pairClass]) =>
          foreground === "destructive" &&
          pairClass === "boundary" &&
          ["background", "input"].some((surface) => surface === background),
      )
      .map(([, background]) => background);

    expect(pairs.toSorted()).toEqual(["background", "input"]);
    expect(markdown).toContain("the invalid field edge");
    expect(markdown).toContain("`destructive` on the `input` fill");
    expect(markdown).toContain(
      "the `background` canvas a transparent field paints",
    );
  });

  it("states the pressed field edge on the input fill", () => {
    expect(markdownProse).toContain(
      "a pressed field repaints its border with `ring` on its own `input` fill",
    );
    expect(markdownProse).toContain(
      "The pressed edge is `ring` on the same `input` fill",
    );
  });

  it("names every wash the secondary text pairs are held against", () => {
    const washes = [
      ...new Set(
        contrastPairs
          .filter(([foreground]) => foreground === "mutedForeground")
          .map(([, background]) => background),
      ),
    ].filter((background) =>
      ["hover", "active", "accent", "selected"].includes(background),
    );

    expect(washes).toEqual(["hover", "active", "accent", "selected"]);
    washes.forEach((wash) => {
      expect(markdown, wash).toContain(`\`${wash}\``);
    });
  });

  it("names every fill the control edge is held against", () => {
    // Derived from the contract. The filter used to name six fills by hand, so
    // plan 327's `accentHover`/`accentActive` pairs never reached the sentence.
    const plainSurfaces: ReadonlySet<string> = new Set([
      "background",
      "card",
      "popover",
      "muted",
      "input",
      "disabled",
    ]);
    const softFills: ReadonlySet<string> = new Set(
      statusTones.map((tone) => `${tone}Soft`),
    );
    const fills = [
      ...new Set(
        contrastPairs
          .filter(([foreground]) => foreground === "border")
          .map(([, background]) => background),
      ),
    ].filter(
      (background) =>
        !plainSurfaces.has(background) && !softFills.has(background),
    );

    expect(fills).toEqual([
      "secondary",
      "secondaryHover",
      "secondaryActive",
      "hover",
      "active",
      "accent",
      "accentHover",
      "accentActive",
      "selected",
    ]);

    const controlFills = fills.slice(0, -1).map((fill) => `\`${fill}\``);
    const controlList = `${controlFills.slice(0, -1).join(", ")} and ${
      controlFills[controlFills.length - 1]
    }`;
    const sentence = `the ${controlList} fills a bordered control paints, on the \`selected\` fill an outline action sits on in a selected row`;
    expect(markdown.replace(/\s+/g, " ")).toContain(sentence);
  });

  it("states where default body text is measured", () => {
    const sentence =
      "Default body text is measured on `background`, `card`, the `muted` panel, `popover`, the `hover`/`active`/`accent`/`selected` washes and the four soft status fills an Alert's description and ghost dismiss control paint (`infoSoft`, `successSoft`, `warningSoft`, `destructiveSoft`); typed text is `inputForeground` on the `input` fill and on the four `Surface` tones a transparent field can sit on (`background`, `card`, `popover`, `muted`), the same set the placeholder is measured on. The placeholder is held to the same secondary floor on the `input` fill and on all four `Surface` tones a transparent field can sit on (`background`, `card`, `muted`, `popover`); a field on a row wash and a disabled field are deliberately out of scope — the latter reads `disabledForeground`, which plan `306` measures — and identity dark `#7C8595` measured 4.03:1 on the quiet panel and the floating surface until plan `317` moved it to `#858F9F`. The panel and the floating surface are not academic: an avatar's fallback initials sit on `muted`, and a date picker's month header sits on its `popover`. The row washes are not either: a selectable list row paints `accent` on hover and `selected` when selected, and its title is `foreground` on both — a `ListItemTitle` sets its own colour, so it overrides the `selectedForeground` the row inherits. Every pair clears the body floor with margin in every shipped set, so no value moves; the pairs exist so an edited theme cannot break them silently.";
    expect(markdown.replace(/\s+/g, " ")).toContain(sentence);
  });

  it("names every surface the surface pairs are held against", () => {
    const softPairs = contrastPairs.filter(
      ([foreground, , pairClass]) =>
        pairClass === "surface" &&
        statusTones.some((tone) => foreground === `${tone}Soft`),
    );
    const surfaces = [...new Set(softPairs.map(([, surface]) => surface))];
    const names = surfaces.map((surface) => `\`${surface}\``);
    const list = `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
    const sentence =
      "A soft surface is a surface in its own right: it is held to " +
      `${contrastFloors.default.surface}:1 against ${list}, so an Alert, Badge or Toast stays ` +
      "perceivable on every shipped canvas, platform variants included.";

    expect(markdown.replace(/\s+/g, " ")).toContain(sentence);
    expect(new Set(softPairs.map(([role]) => role))).toEqual(
      new Set(statusTones.map((tone) => `${tone}Soft`)),
    );
  });

  it("states the skeleton floor the contract enforces", () => {
    const surfaces = contrastPairs
      .filter(([foreground]) => foreground === "skeleton")
      .map(([, surface]) => surface);
    const names = surfaces.map((surface) => `\`${surface}\``);
    const list = `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
    const sentence =
      "A loading skeleton is a surface too: it is held to " +
      `${contrastFloors.default.surface}:1 against ${list}, so a placeholder never ` +
      "disappears into the card it fills or the row it sits in.";

    expect(markdown.replace(/\s+/g, " ")).toContain(sentence);
    expect(surfaces).toEqual([
      "background",
      "card",
      "popover",
      "muted",
      "hover",
      "active",
      "accent",
      "selected",
    ]);
  });

  it("names the skeleton and the owned tint a real platform style carries", () => {
    const real = platformNames.filter((platform) => platform !== "default");
    real.forEach((platform) => {
      expect(
        platformStyles[platform].colors.dark.skeleton,
        platform,
      ).toBeDefined();
    });
    // Plan 374: every real dark style names its soft destructive tint, because
    // a style applied over another platform's theme must not keep that
    // platform's value. Linux owns a darker tint; the others name the identity.
    expect(platformStyles.darwin.colors.dark.destructiveSoft).toBe(
      darkColors.destructiveSoft,
    );
    expect(platformStyles.win32.colors.dark.destructiveSoft).toBe(
      darkColors.destructiveSoft,
    );
    expect(platformStyles.linux.colors.dark.destructiveSoft).toBe(
      palette.red[950],
    );
    platformRecipeNames.forEach((recipe) => {
      expect(platformRecipes[recipe].colors.dark.destructiveSoft, recipe).toBe(
        darkColors.destructiveSoft,
      );
    });
    expect(markdown).toContain("surfaces (including the loading skeleton)");
    expect(markdown).toContain("(the other status roles, disabled, scrollbar)");
    expect(markdown).not.toContain("(status, disabled, skeleton, scrollbar)");
    expect(markdown).toContain("plan `374`");
  });
});

describe("docs/design-system.md", () => {
  it("states the identity's body, label and control metrics", () => {
    const sentence = `${typography.body.fontSize}px body text, ${typography.label.fontSize}px labels, ${defaultDensity.controlHeight.md}px default controls`;
    expect(designSystem.includes(sentence), sentence).toBe(true);
  });

  it("states the role count the shipped themes carry", () => {
    const sentence = `exactly the same ${colorRoles.length} roles`;
    expect(designSystem.includes(sentence), sentence).toBe(true);
  });

  it("states the canvas, raised and floating surface of both themes", () => {
    const surfaces = [
      ["canvas", "background"],
      ["raised surface", "card"],
      ["floating surface", "popover"],
    ] as const;

    surfaces.forEach(([label, role]) => {
      const sentence = `| ${label} | \`${themes.light.colors[role]}\` | \`${themes.dark.colors[role]}\` |`;
      expect(designSystem.includes(sentence), sentence).toBe(true);
    });
  });

  it("states the filled action pairs of both themes", () => {
    const primary = `| primary | dark iris \`${themes.light.colors.primary}\`, white text | light iris \`${themes.dark.colors.primary}\`, near-black text |`;
    const destructive = `| destructive | \`${themes.light.colors.destructive}\`, white text | \`${themes.dark.colors.destructive}\`, near-black red text |`;
    expect(designSystem.includes(primary), primary).toBe(true);
    expect(designSystem.includes(destructive), destructive).toBe(true);
  });

  it("states the alpha state's measured cost and the helper that replaces it", () => {
    const figures =
      "drops the label to **2.06:1** on a Linux light card at 50%";
    expect(designSystem.includes(figures), figures).toBe(true);
    expect(designSystem).toContain("`filledControl(theme, family)`");
  });

  it("states the type ladders the numeric contract enforces", () => {
    const sentence =
      "The numeric contract holds an edited theme to the same two ladders and to the weight-variant rule: `body` → `bodyStrong` may not shrink and must gain weight";
    expect(designSystem.includes(sentence), sentence).toBe(true);

    const ladder = (roles: ReadonlyArray<string>): string =>
      `(\`${roles[0] ?? ""}\` → \`${roles.at(-1) ?? ""}\`)`;
    expect(designSystem).toContain(ladder(proseLadder));
    expect(designSystem).toContain(ladder(codeLadder));
  });

  it("states that every numeric metric must be finite", () => {
    const prose = designSystem.replace(/\s+/g, " ");
    expect(prose).toContain("Every numeric metric must be a **finite** number");
  });

  it("summarises every type role with its real metrics", () => {
    const { body, label, caption, code, codeBlock } = typography;

    [
      `- \`body\` / \`bodyStrong\` — reading and emphasis at ${body.fontSize}/${body.lineHeight}.`,
      `- \`label\` — controls and form labels at ${label.fontSize}/${label.lineHeight}, medium weight.`,
      `- \`caption\` — metadata and helper text at ${caption.fontSize}/${caption.lineHeight}.`,
      `- \`code\` / \`codeBlock\` — mono at ${code.fontSize}/${code.lineHeight} and ${codeBlock.fontSize}/${codeBlock.lineHeight}.`,
    ].forEach((sentence) => {
      expect(designSystem.includes(sentence), sentence).toBe(true);
    });
  });

  it("states the spacing scale", () => {
    const sentence = `Spacing is a 4px-derived scale: ${Object.values(spacing).join(", ")}.`;
    expect(designSystem.includes(sentence), sentence).toBe(true);
  });

  it("states every density preset's metrics", () => {
    Object.values(densityPresets).forEach((preset) => {
      const sentence = `- \`${preset.name}\` — ${preset.controlHeight.sm}/${preset.controlHeight.md}/${preset.controlHeight.lg} controls, ${preset.rowHeight}px rows.`;
      expect(designSystem.includes(sentence), sentence).toBe(true);
    });
  });

  it("states the icon and avatar tiers", () => {
    const sentence = `icons run ${Object.values(iconSize).join("/")} and avatars ${Object.values(avatarSize).join("/")},`;
    expect(designSystem.includes(sentence), sentence).toBe(true);
  });

  it("states the fixed component dimensions", () => {
    const sentence = `overlay surfaces take a ${dimensions.overlayMinWidth}px minimum and a ${dimensions.overlayWidth}px default width, and a long list scrolls at ${dimensions.overlayMaxHeight}px; a toast is ${dimensions.toastWidth}px wide, a preview card runs ${dimensions.previewCardMinWidth}–${dimensions.previewCardMaxWidth}px, and an icon or clear control inside a field is ${dimensions.fieldAdornmentSize}px.`;
    expect(designSystem.includes(sentence), sentence).toBe(true);
  });

  it("names the platform families the implementation ships", () => {
    const sentinel = `Sans is GPUI's \`${systemUiFont}\` sentinel`;
    expect(designSystem.includes(sentinel), sentinel).toBe(true);

    const families = `Mono comes from the platform table (\`platformTypes\`): \`${platformTypes.darwin.mono}\` on macOS, \`${platformTypes.linux.mono}\` on Linux, \`${platformTypes.win32.mono}\` on Windows, \`${platformTypes.default.mono}\` for a platform the library does not know.`;
    expect(designSystem.includes(families), families).toBe(true);
  });

  it("states that a high-contrast platform keeps its elevation levels", () => {
    const sentence =
      "At high contrast the families and shape apply — each platform's radii, density, motion and elevation levels — while the AAA colour set, the `shadow` tint included, wins over platform resemblance.";
    expect(designSystem.includes(sentence), sentence).toBe(true);
  });

  it("states the icon-to-label gap the spacing scale defines", () => {
    const sentence = `The gap between icon and label is \`spacing.sm\` (${spacing.sm}px).`;
    expect(designSystem.includes(sentence), sentence).toBe(true);
  });

  it("states the floors the contrast checker enforces", () => {
    const rows = [
      `| body text on \`background\`/\`card\`/\`muted\`/\`popover\`/\`input\`, the \`hover\`/\`active\`/\`accent\`/\`selected\` washes and the four soft status fills an Alert's description paints; typed text on \`input\` and on the \`background\`/\`card\`/\`popover\`/\`muted\` surfaces a transparent field sits on | ${contrastFloors.default.body}:1 | ${contrastFloors.high.body}:1 |`,
      `| a menu row's label (\`popoverForeground\` on \`hover\`/\`active\`, and on \`selected\` for a selected \`Select\` option) | ${contrastFloors.default.body}:1 | ${contrastFloors.high.body}:1 |`,
      `| selected row label (\`selectedForeground\` on \`selected\`, the \`accent\` wash a hovered selectable row paints and the \`hover\`/\`active\` pointer washes) | ${contrastFloors.default.secondary}:1 | ${contrastFloors.high.secondary}:1 |`,
      `| secondary text (\`mutedForeground\` on plain surfaces, on the \`input\` fill a field paints for its own chrome, on the \`hover\`, \`active\`, \`accent\` and \`selected\` washes and on the four soft status fills a status panel's caption sits on), on-colour text, placeholder text on the \`input\` fill and the \`background\`/\`card\`/\`popover\`/\`muted\` surfaces a transparent field sits on, ghost text on the \`hover\`/\`active\` washes | ${contrastFloors.default.secondary}:1 | ${contrastFloors.high.secondary}:1 |`,
      `| brand-toned text (\`primaryText\`) on \`background\`/\`card\`/\`popover\`/\`muted\`, the \`hover\`/\`active\` washes, the \`accent\`/\`selected\` row fills and the four soft status fills a link in a status panel sits on | ${contrastFloors.default.secondary}:1 | ${contrastFloors.high.secondary}:1 |`,
      `| filled-control states (\`primaryForeground\`/\`secondaryForeground\`/\`destructiveForeground\`/\`accentForeground\` on each family's \`x\`, \`xHover\` and \`xActive\`) | ${contrastFloors.default.secondary}:1 | ${contrastFloors.high.secondary}:1 |`,
      `| interactive fills and washes (\`hover\`, \`active\`, \`accent\`, \`selected\`, and each filled family's \`x\`/\`xHover\`/\`xActive\`) on \`background\`/\`card\`/\`popover\`/\`muted\` | ${contrastFloors.default.surface}:1 | ${contrastFloors.high.surface}:1 |`,
      `| state steps (\`xHover\` from \`x\` and \`xActive\` from \`xHover\` for \`primary\`/\`secondary\`/\`destructive\`/\`accent\`, and the generic wash's \`active\` from \`hover\`) | ${contrastFloors.default.step}:1 | ${contrastFloors.high.step}:1 |`,
      `| soft status text (\`xSoftForeground\` on \`xSoft\`) | ${contrastFloors.default.body}:1 | ${contrastFloors.high.body}:1 |`,
      `| a Toast's tone glyph and bar (\`infoSoftForeground\`/\`successSoftForeground\`/\`warningSoftForeground\`/\`destructiveSoftForeground\` on \`popover\`, the shipped composition until \`components\` paints \`xText\`) | ${contrastFloors.default.secondary}:1 | ${contrastFloors.high.secondary}:1 |`,
      `| status text (\`xText\`) on \`background\`/\`card\`/\`popover\`, the \`muted\` panel and the \`hover\`/\`active\`/\`accent\`/\`selected\` washes | ${contrastFloors.default.secondary}:1 | ${contrastFloors.high.secondary}:1 |`,
      `| text selection (body text over the composited \`selection\` wash on \`background\`/\`card\`/\`muted\`/\`hover\`/\`active\`/\`accent\`/\`popover\`/\`input\`, and a card's own \`cardForeground\` on \`card\`) | ${contrastFloors.default.body}:1 | ${contrastFloors.high.body}:1 |`,
      `| text selection on a soft status fill (\`xSoftForeground\`, \`foreground\` and \`mutedForeground\` over the wash on \`infoSoft\`/\`successSoft\`/\`warningSoft\`/\`destructiveSoft\`) | ${contrastFloors.default.body}:1 / ${contrastFloors.default.secondary}:1 | ${contrastFloors.high.body}:1 / ${contrastFloors.high.secondary}:1 |`,
      `| text selection in a selected row (\`selectedForeground\` over the wash on \`selected\`) | ${contrastFloors.default.secondary}:1 | ${contrastFloors.high.secondary}:1 |`,
      `| text selection of secondary text (\`mutedForeground\` over the composited \`selection\` wash on \`background\`/\`card\`/\`muted\`/\`hover\`/\`active\`/\`accent\`/\`popover\`/\`input\`/\`selected\`) | ${contrastFloors.default.secondary}:1 | ${contrastFloors.high.secondary}:1 |`,
      `| text selection of a status label (\`xText\` over the composited \`selection\` wash on \`background\`/\`card\`/\`muted\`/\`hover\`/\`active\`/\`accent\`/\`popover\`/\`input\`/\`selected\`) | ${contrastFloors.default.secondary}:1 | ${contrastFloors.high.secondary}:1 |`,
      `| text selection wash (\`selection\` composited over \`background\`/\`card\`/\`muted\`/\`hover\`/\`active\`/\`accent\`/\`popover\`/\`input\`/\`selected\` and the four soft status fills) | ${contrastFloors.default.surface}:1 | ${contrastFloors.high.surface}:1 |`,
      `| text selection on a filled action (\`primaryForeground\`/\`secondaryForeground\`/\`destructiveForeground\` over the composited \`selectionOnFill\` veil) | ${contrastFloors.default.secondary}:1 | ${contrastFloors.high.secondary}:1 |`,
      `| text selection veil on a filled action (\`selectionOnFill\` over \`primary\`/\`secondary\`/\`destructive\`) | ${contrastFloors.default.surface}:1 | ${contrastFloors.high.surface}:1 |`,
      `| focus ring (\`ring\`) on \`background\`/\`card\`/\`popover\`/\`muted\`/\`accent\`, the \`hover\`/\`active\`/\`selected\` washes and the four soft status fills, the \`destructive\` ring an invalid control paints on the same surfaces, essential boundaries (\`borderStrong\`) on \`background\`/\`card\`/\`popover\`/\`muted\` and the \`input\` fill a field sits on, the four state washes and the four soft status fills, plus the invalid field edge (\`destructive\` on \`input\`/\`background\`) and the field's pressed edge (\`ring\` on \`input\`) | ${contrastFloors.default.boundary}:1 | ${contrastFloors.high.boundary}:1 |`,
      `| graphic marks (\`primary\`/\`success\`/\`destructive\` on \`background\`/\`card\`/\`popover\`/\`muted\`, \`primary\` and \`destructive\` on the \`input\` fill a slider thumb rings, and \`primary\` on the \`hover\` wash a highlighted combobox option paints its check on) | ${contrastFloors.default.mark}:1 | ${contrastFloors.high.mark}:1 |`,
      `| value indicator groove (\`track\`) on \`background\`/\`card\`/\`popover\`/\`muted\` and the \`accent\`/\`selected\` fills | ${contrastFloors.default.surface}:1 | ${contrastFloors.high.surface}:1 |`,
      `| value indicator marks (\`primary\`/\`success\`/\`destructive\`/\`mutedForeground\` on \`track\`) | ${contrastFloors.default.mark}:1 | ${contrastFloors.high.mark}:1 |`,
      `| soft status surface (\`xSoft\`) on \`background\`/\`card\`/\`popover\`/\`muted\` | ${contrastFloors.default.surface}:1 | ${contrastFloors.high.surface}:1 |`,
      `| soft status edge (\`xSoftBorder\` on \`xSoft\` and on the eight surfaces a chip sits on) | ${contrastFloors.default.divider}:1 | ${contrastFloors.high.divider}:1 |`,
      `| inactive label (\`disabledForeground\` on the \`disabled\` fill, \`background\`/\`card\`/\`popover\`/\`muted\`, the \`hover\`/\`active\`/\`accent\`/\`selected\` washes and the four soft status fills) | ${contrastFloors.default.inactive}:1 | ${contrastFloors.high.inactive}:1 |`,
      `| loading skeleton (\`skeleton\`) on \`background\`/\`card\`/\`popover\`/\`muted\` and the \`hover\`/\`active\`/\`accent\`/\`selected\` washes | ${contrastFloors.default.surface}:1 | ${contrastFloors.high.surface}:1 |`,
      `| decorative dividers (\`border\`) on \`background\`/\`card\`/\`popover\`/\`muted\`, the \`input\` fill a field sits on, the \`secondary\`/\`secondaryHover\`/\`secondaryActive\`/\`hover\`/\`active\`/\`accent\`/\`accentHover\`/\`accentActive\` fills a bordered control paints, the \`selected\` fill an outline action sits on in a selected row, the \`disabled\` fill a disabled control keeps its edge on and the four soft status fills a status panel divides | ${contrastFloors.default.divider}:1 | ${contrastFloors.high.divider}:1 |`,
    ];
    rows.forEach((row) => {
      expect(designSystem.includes(row), row).toBe(true);
    });
  });

  it("names every mark role and surface the contract measures", () => {
    const row = tableRow("graphic marks (");
    markPairs.forEach(([role, surface]) => {
      expect(row, `${role} on ${surface}`).toContain(`\`${role}\``);
      expect(row, `${role} on ${surface}`).toContain(`\`${surface}\``);
    });
  });

  it("names the value indicator's groove and every mark painted on it", () => {
    const groove = tableRow("value indicator groove (");
    trackSurfacePairs.forEach(([, surface]) => {
      expect(groove, surface).toContain(`\`${surface}\``);
    });

    const marks = tableRow("value indicator marks (");
    trackMarkPairs.forEach(([role]) => {
      expect(marks, role).toContain(`\`${role}\``);
    });
    expect(marks).toContain("`track`");
  });

  it("names every Toast tone role the contract measures on its card", () => {
    const row = tableRow("a Toast's tone glyph and bar (");
    toastTonePairs.forEach(([role]) => {
      expect(row, role).toContain(`\`${role}\``);
    });
    expect(row).toContain("`popover`");
  });

  it("names every control boundary role and surface the contract measures", () => {
    const row = tableRow("focus ring (`ring`) on");

    const expand = (text: string): string =>
      text
        .replace(
          "the four state washes",
          "`hover` `active` `accent` `selected`",
        )
        .replace(
          "the four soft status fills",
          "`infoSoft` `successSoft` `warningSoft` `destructiveSoft`",
        );

    const clause = (from: string, to: string): string => {
      const start = row.indexOf(from);
      expect(start, from).toBeGreaterThanOrEqual(0);
      return expand(row.slice(start, row.indexOf(to)));
    };

    const surfacesOf = (role: "ring" | "borderStrong"): ReadonlyArray<string> =>
      contrastPairs
        .filter(
          ([foreground, , pairClass]) =>
            foreground === role && pairClass === "boundary",
        )
        .map(([, surface]) => surface);

    ["ring", "destructive", "borderStrong"].forEach((role) => {
      expect(row, role).toContain(`\`${role}\``);
    });

    const ringClause = clause("(`ring`) on", ", the `destructive` ring");
    surfacesOf("ring")
      .filter((surface) => surface !== "input")
      .forEach((surface) => {
        expect(ringClause, surface).toContain(`\`${surface}\``);
      });
    expect(row).toContain("the field's pressed edge (`ring` on `input`)");

    const boundaryClause = clause("(`borderStrong`) on", ", plus");
    surfacesOf("borderStrong").forEach((surface) => {
      expect(boundaryClause, surface).toContain(`\`${surface}\``);
    });
  });

  it("has a floor row for every pair class the checker enforces", () => {
    const rowFor: Readonly<Record<ContrastPairClass, string>> = {
      body: "| body text on",
      secondary: "| secondary text (",
      inactive: "| inactive label (",
      boundary: "| focus ring (",
      mark: "| graphic marks (",
      surface: "| interactive fills and washes (",
      step: "| state steps (",
      divider: "| decorative dividers (",
    };

    expect(new Set(Object.keys(rowFor))).toEqual(
      new Set(Object.keys(contrastFloors.default)),
    );
    Object.entries(rowFor).forEach(([pairClass, prefix]) => {
      expect(designSystemSource.includes(prefix), pairClass).toBe(true);
    });
  });

  it("states the mark floor beside the fill floor", () => {
    expect(designSystem).toContain(
      "A fill is not automatically a surface. A solid role painted as a bar, " +
        "a glyph or a dot — a progress segment, a slider fill, a slider " +
        "thumb's ring, a rating star, a combobox check, a timeline dot — is a " +
        `**mark**, held to ${contrastFloors.default.mark}:1 ` +
        `(${contrastFloors.high.mark}:1 at AAA).`,
    );
    expect(designSystem).toContain(
      "Status marks are `xText`, never the solid status fill",
    );
  });

  it("names every interactive fill and the surfaces it is held against", () => {
    const fillRoles: ReadonlySet<string> = new Set(stateFillRoles);
    const pairs = contrastPairs.filter(
      ([foreground, , pairClass]) =>
        fillRoles.has(foreground) && pairClass === "surface",
    );

    expect(pairs).toEqual(stateFillSurfacePairs);
    expect(pairs).toHaveLength(60);
    stateFillRoles.forEach((fill) => {
      expect(markdown, fill).toContain(`\`${fill}\``);
    });
    stateFillSurfaces.forEach((surface) => {
      expect(markdown, surface).toContain(`\`${surface}\``);
    });
    expect(markdown).toContain("stateFillSurfacePairs");
    expect(markdown).toContain("stateFillRoles");
    expect(markdown).toContain("stateFillSurfaces");
  });

  it("names every surface default body text is measured on", () => {
    const surfaces = contrastPairs
      .filter(
        ([foreground, , pairClass]) =>
          foreground === "foreground" && pairClass === "body",
      )
      .map(([, background]) => background);

    expect(surfaces).toEqual([
      "background",
      "card",
      "muted",
      "popover",
      "hover",
      "active",
      "accent",
      "selected",
      "infoSoft",
      "successSoft",
      "warningSoft",
      "destructiveSoft",
    ]);
    surfaces.forEach((surface) => {
      expect(designSystem.includes(`\`${surface}\``), surface).toBe(true);
    });
  });

  it("states the radius scale", () => {
    const sentence = `Radii: ${radius.none}, ${radius.sm}, ${radius.md}, ${radius.lg}, ${radius.xl}, full.`;
    expect(designSystem.includes(sentence), sentence).toBe(true);
  });
});

describe("docs/design-system.md interaction states", () => {
  /**
   * Plan 354 guards the state table, the last hand-written list on the page.
   * It had drifted: the link row omitted the four soft status fills plan 346
   * added, the loading row said "every surface" while naming four of eight,
   * and the focus row named none. Each case derives its surfaces from the
   * pair list the checker runs, so a new pair cannot ship with a state row
   * that forgets it.
   */
  const expand = (text: string): string =>
    text
      .replace(
        "the four soft status fills",
        "`infoSoft` `successSoft` `warningSoft` `destructiveSoft`",
      )
      .replace("the four row washes", "`hover` `active` `accent` `selected`");

  const missing = (
    label: string,
    surfaces: ReadonlyArray<string>,
  ): ReadonlyArray<string> => {
    const text = expand(tableRow(label));
    return surfaces.filter((surface) => !text.includes(`\`${surface}\``));
  };

  const backgroundsOf = (foreground: string): ReadonlyArray<string> => [
    ...new Set(
      contrastPairs
        .filter(([role]) => role === foreground)
        .map(([, background]) => background),
    ),
  ];

  it("has a row for every interaction state", () => {
    [
      "hover",
      "pressed",
      "loading",
      "selected",
      "link",
      "disabled",
      "invalid",
      "focus",
      "text selection",
      "status",
    ].forEach((state) =>
      expect(tableRow(state).length, state).toBeGreaterThan(0),
    );
  });

  it("names every surface an interactive wash is measured on", () => {
    (
      [
        ["hover", "hover"],
        ["pressed", "active"],
      ] as const
    ).forEach(([label, role]) => {
      const surfaces = stateFillSurfacePairs
        .filter(([fill]) => fill === role)
        .map(([, surface]) => surface);
      expect(missing(label, surfaces), label).toEqual([]);
    });
  });

  it("names every surface a loading placeholder is measured on", () => {
    expect(missing("loading", backgroundsOf("skeleton"))).toEqual([]);
  });

  it("names the selected fill and its label's washes", () => {
    const fillSurfaces = stateFillSurfacePairs
      .filter(([fill]) => fill === "selected")
      .map(([, surface]) => surface);
    expect(missing("selected", fillSurfaces)).toEqual([]);
    expect(missing("selected", backgroundsOf("selectedForeground"))).toEqual(
      [],
    );
  });

  it("names every surface a link is measured on", () => {
    expect(missing("link", backgroundsOf("primaryText"))).toEqual([]);
  });

  it("names every surface an inactive label is measured on", () => {
    expect(missing("disabled", backgroundsOf("disabledForeground"))).toEqual(
      [],
    );
  });

  it("names the invalid field edge and the two ring roles", () => {
    expect(missing("invalid", ["input", "background"])).toEqual([]);
    const focus = tableRow("focus");
    expect(focus).toContain("`ring`");
    expect(focus).toContain("`destructive`");
  });

  it("names every surface the focus ring is measured on", () => {
    const surfaces = backgroundsOf("ring").filter(
      (surface) => surface !== "input",
    );
    expect(missing("focus", surfaces)).toEqual([]);
  });

  it("names every surface status text is measured on", () => {
    expect(missing("status", backgroundsOf("infoText"))).toEqual([]);
  });

  it("names the selection roles", () => {
    const text = tableRow("text selection");
    expect(text).toContain("`selection`");
    expect(text).toContain("`selectionOnFill`");
  });
});
