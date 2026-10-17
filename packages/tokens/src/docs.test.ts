/**
 * Guards `docs/tokens.md` against drift: its colour tables repeat every
 * semantic role for both default and high-contrast themes, so a palette or
 * role edit that is not mirrored in the docs would ship a catalogue that
 * disagrees with the theme. The test parses the documented rows and compares
 * them with the implementation.
 *
 * The numeric tables (typography, spacing, radius, density, elevation, motion,
 * border/icon/avatar sizes) are guarded the other way round: the test builds the
 * documented row from the implementation and requires the markdown to contain
 * it, so a value edit cannot ship a document that lies. The same builder holds
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
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { alpha, colorRoles, palette } from "./color.js";
import {
  compositeOver,
  contrastFloors,
  contrastPairs,
  contrastRatio,
  stateFillRoles,
  stateFillSurfacePairs,
  stateFillSurfaces,
} from "./contrast.js";
import {
  elevationShadow,
  type BoxShadow,
  type ElevationLevel,
} from "./elevation.js";
import * as Tokens from "./index.js";
import { motion } from "./motion.js";
import {
  isPlatformRecipeName,
  platformRecipeNames,
  platformRecipes,
} from "./platform-recipes.js";
import {
  platformNames,
  platformStyles,
  platformTypes,
  systemUiFont,
} from "./platforms.js";
import {
  avatarSize,
  borderWidth,
  defaultDensity,
  densityPresets,
  iconSize,
  radius,
  spacing,
} from "./scale.js";
import { statusTones } from "./styles.js";
import { getPlatformTheme, highContrastThemes, themes } from "./theme.js";
import { textRoles, typography } from "./typography.js";

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
const designSystem = readFileSync(
  new URL("../../../docs/design-system.md", import.meta.url),
  "utf8",
).replace(/\s+/g, " ");

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
      "`xSoftForeground`.";
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
      "`selectionSoftPairs` measures the tone's text through the wash",
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

describe("docs/tokens.md runtime reach", () => {
  it("names the application point for native text selection", () => {
    expect(markdown).toContain("`selectionColor`");
    expect(markdown).toContain("`userSelect`");
  });

  it("records the scrollbar tint the pinned runtime lacks", () => {
    expect(markdown).toContain("`scrollbarColor`");
    expect(markdown).toContain("`scrollbarWidth`");
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
      "The focus ring is measured on the eight surfaces a focused control can sit on — the canvas, card and popover, the `muted` panel a sidebar control sits on, the `accent` wash a selectable row paints, and the `hover`, `active` and `selected` washes — because focus and selection co-occur in rows. It is also measured on the four soft status fills, because a Toast's action button is focused while it sits on its own tint; every shipped variant already clears the floor there, so no colour moves, and the pairs exist so an edited theme cannot remove the ring. A field's own `input` fill and a control's `secondary` fill are what the ring surrounds, not what it sits on, so they are deliberately not ring surfaces. `ringSurfaces` in `src/contrast.ts` is the one list, and `ring-surfaces.test.ts` holds the public check to it. Secondary text is measured on `hover`, `active`, `accent` and `selected`, because a list row, a combobox option and a menu item paint those washes behind a description; status text (`xText`) is measured on `background`, `card`, `popover`, the `muted` panel and those four washes, so a status label or indicator dot in a sidebar, a hovered, pressed or selected row or a dialog is covered; the `borderStrong` boundary is measured on `popover`, the `muted` panel and those four washes, so a checkbox or field in a quiet panel, a hovered, pressed, selectable or selected row still shows its edge. It is also measured on the four soft status fills, because an Alert or Toast carries actions — a field, a don't-show-again checkbox — whose edge must stay visible.";
    expect(markdown.replace(/\s+/g, " ")).toContain(sentence);
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
    const fills = [
      ...new Set(
        contrastPairs
          .filter(([foreground]) => foreground === "border")
          .map(([, background]) => background),
      ),
    ].filter((background) =>
      ["secondary", "hover", "active", "accent"].includes(background),
    );

    expect(fills).toEqual(["secondary", "hover", "active", "accent"]);
    const sentence =
      "the `secondary`, `hover`, `active` and `accent` fills a bordered control paints";
    expect(markdown.replace(/\s+/g, " ")).toContain(sentence);
  });

  it("states where default body text is measured", () => {
    const sentence =
      "Default body text is measured on `background`, `card`, the `muted` panel, `popover` and the `hover`/`active`/`accent`/`selected` washes; typed text is `inputForeground` on the `input` fill and on the `background` canvas a transparent field paints. The placeholder is held to the same secondary floor on the `input` fill and on all four `Surface` tones a transparent field can sit on (`background`, `card`, `muted`, `popover`); a field on a row wash and a disabled field are deliberately out of scope — the latter reads `disabledForeground`, which plan `306` measures — and identity dark `#7C8595` measured 4.03:1 on the quiet panel and the floating surface until plan `317` moved it to `#858F9F`. The panel and the floating surface are not academic: an avatar's fallback initials sit on `muted`, and a date picker's month header sits on its `popover`. The row washes are not either: a selectable list row paints `accent` on hover and `selected` when selected, and its title is `foreground` on both — a `ListItemTitle` sets its own colour, so it overrides the `selectedForeground` the row inherits. Every pair clears the body floor with margin in every shipped set, so no value moves; the pairs exist so an edited theme cannot break them silently.";
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
      "selected",
    ]);
  });

  it("names the skeleton a real platform style carries", () => {
    const real = platformNames.filter((platform) => platform !== "default");
    real.forEach((platform) => {
      expect(
        platformStyles[platform].colors.dark.skeleton,
        platform,
      ).toBeDefined();
    });
    expect(markdown).toContain("surfaces (including the loading skeleton)");
    expect(markdown).toContain("(status, disabled, scrollbar)");
    expect(markdown).not.toContain("(status, disabled, skeleton, scrollbar)");
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

  it("names the platform families the implementation ships", () => {
    const sentinel = `Sans is GPUI's \`${systemUiFont}\` sentinel`;
    expect(designSystem.includes(sentinel), sentinel).toBe(true);

    const families = `Mono comes from the platform table (\`platformTypes\`): \`${platformTypes.darwin.mono}\` on macOS, \`${platformTypes.linux.mono}\` on Linux, \`${platformTypes.win32.mono}\` on Windows, \`${platformTypes.default.mono}\` for a platform the library does not know.`;
    expect(designSystem.includes(families), families).toBe(true);
  });

  it("states the icon-to-label gap the spacing scale defines", () => {
    const sentence = `The gap between icon and label is \`spacing.sm\` (${spacing.sm}px).`;
    expect(designSystem.includes(sentence), sentence).toBe(true);
  });

  it("states the floors the contrast checker enforces", () => {
    const rows = [
      `| body text on \`background\`/\`card\`/\`muted\`/\`popover\`/\`input\` and the \`hover\`/\`active\`/\`accent\`/\`selected\` washes; typed text on \`input\` and on the \`background\` canvas a transparent field paints | ${contrastFloors.default.body}:1 | ${contrastFloors.high.body}:1 |`,
      `| a menu row's label (\`popoverForeground\` on \`hover\`/\`active\`, and on \`selected\` for a selected \`Select\` option) | ${contrastFloors.default.body}:1 | ${contrastFloors.high.body}:1 |`,
      `| selected row label (\`selectedForeground\` on \`selected\`, the \`accent\` wash a hovered selectable row paints and the \`hover\`/\`active\` pointer washes) | ${contrastFloors.default.secondary}:1 | ${contrastFloors.high.secondary}:1 |`,
      `| secondary text (\`mutedForeground\` on plain surfaces and on the \`hover\`, \`active\`, \`accent\` and \`selected\` washes), on-colour text, placeholder text on the \`input\` fill and the \`background\`/\`card\`/\`popover\`/\`muted\` surfaces a transparent field sits on, ghost text on the \`hover\`/\`active\` washes | ${contrastFloors.default.secondary}:1 | ${contrastFloors.high.secondary}:1 |`,
      `| filled-control states (\`primaryForeground\`/\`secondaryForeground\`/\`destructiveForeground\` on each family's \`x\`, \`xHover\` and \`xActive\`) | ${contrastFloors.default.secondary}:1 | ${contrastFloors.high.secondary}:1 |`,
      `| interactive fills and washes (\`hover\`, \`active\`, \`accent\`, \`selected\`, and each filled family's \`x\`/\`xHover\`/\`xActive\`) on \`background\`/\`card\`/\`popover\`/\`muted\` | ${contrastFloors.default.surface}:1 | ${contrastFloors.high.surface}:1 |`,
      `| soft status text (\`xSoftForeground\` on \`xSoft\`) | ${contrastFloors.default.body}:1 | ${contrastFloors.high.body}:1 |`,
      `| status text (\`xText\`) on \`background\`/\`card\`/\`popover\`, the \`muted\` panel and the \`hover\`/\`active\`/\`accent\`/\`selected\` washes | ${contrastFloors.default.secondary}:1 | ${contrastFloors.high.secondary}:1 |`,
      `| text selection (body text over the composited \`selection\` wash on \`background\`/\`card\`/\`muted\`/\`hover\`/\`active\`/\`accent\`/\`popover\`/\`input\`) | ${contrastFloors.default.body}:1 | ${contrastFloors.high.body}:1 |`,
      `| text selection on a soft status fill (\`xSoftForeground\` over the wash on \`infoSoft\`/\`successSoft\`/\`warningSoft\`/\`destructiveSoft\`) | ${contrastFloors.default.body}:1 | ${contrastFloors.high.body}:1 |`,
      `| text selection in a selected row (\`selectedForeground\` over the wash on \`selected\`) | ${contrastFloors.default.secondary}:1 | ${contrastFloors.high.secondary}:1 |`,
      `| text selection of secondary text (\`mutedForeground\` over the composited \`selection\` wash on \`background\`/\`card\`/\`muted\`/\`hover\`/\`active\`/\`accent\`/\`popover\`/\`input\`/\`selected\`) | ${contrastFloors.default.secondary}:1 | ${contrastFloors.high.secondary}:1 |`,
      `| text selection wash (\`selection\` composited over \`background\`/\`card\`/\`muted\`/\`hover\`/\`active\`/\`accent\`/\`popover\`/\`input\`/\`selected\` and the four soft status fills) | ${contrastFloors.default.surface}:1 | ${contrastFloors.high.surface}:1 |`,
      `| focus ring on \`background\`/\`card\`/\`popover\`/\`muted\`/\`accent\`, the \`hover\`/\`active\`/\`selected\` washes and the four soft status fills, and essential boundaries on \`popover\`, \`muted\`, the four state washes and the four soft status fills | ${contrastFloors.default.boundary}:1 | ${contrastFloors.high.boundary}:1 |`,
      `| soft status surface (\`xSoft\`) on \`background\`/\`card\`/\`popover\`/\`muted\` | ${contrastFloors.default.surface}:1 | ${contrastFloors.high.surface}:1 |`,
      `| soft status edge (\`xSoftBorder\` on \`xSoft\` and on the eight surfaces a chip sits on) | ${contrastFloors.default.divider}:1 | ${contrastFloors.high.divider}:1 |`,
      `| inactive label (\`disabledForeground\` on the \`disabled\` fill, \`background\`/\`card\`/\`popover\`/\`muted\`, the \`hover\`/\`active\`/\`accent\`/\`selected\` washes and the four soft status fills) | ${contrastFloors.default.inactive}:1 | ${contrastFloors.high.inactive}:1 |`,
      `| loading skeleton (\`skeleton\`) on \`background\`/\`card\`/\`popover\`/\`muted\` and the \`hover\`/\`active\`/\`selected\` washes | ${contrastFloors.default.surface}:1 | ${contrastFloors.high.surface}:1 |`,
      `| decorative dividers (\`border\`) on \`background\`/\`card\`/\`popover\`/\`muted\`, the \`input\` fill a field sits on, the \`secondary\`/\`hover\`/\`active\`/\`accent\` fills a bordered control paints, the \`disabled\` fill a disabled control keeps its edge on and the four soft status fills a status panel divides | ${contrastFloors.default.divider}:1 | ${contrastFloors.high.divider}:1 |`,
    ];
    rows.forEach((row) => {
      expect(designSystem.includes(row), row).toBe(true);
    });
  });

  it("names every interactive fill and the surfaces it is held against", () => {
    const fillRoles: ReadonlySet<string> = new Set(stateFillRoles);
    const pairs = contrastPairs.filter(([foreground]) =>
      fillRoles.has(foreground),
    );

    expect(pairs).toEqual(stateFillSurfacePairs);
    expect(pairs).toHaveLength(52);
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
