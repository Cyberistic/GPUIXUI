/**
 * Guards `docs/tokens.md` against drift: its colour tables repeat the 53
 * semantic roles for both default and high-contrast themes, so a palette or
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
 * The figures the catalogue quotes in prose — the status ratios, the
 * design-system's warning figure and the selection wash percentage — are
 * derived here from `contrastRatio`, `contrastFloors` and the alpha byte
 * (plan 075), and the `xText` surfaces from `contrastPairs`, so a palette, floor
 * or contract edit cannot leave a sentence quoting the old values.
 *
 * `node:fs` is used deliberately: this is a documentation test over the tree's
 * own files, and the tokens package ships zero runtime dependencies by design.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { colorRoles, palette } from "./color.js";
import { contrastFloors, contrastPairs, contrastRatio } from "./contrast.js";
import {
  darkElevation,
  lightElevation,
  type BoxShadow,
  type ElevationLevel,
} from "./elevation.js";
import * as Tokens from "./index.js";
import { motion } from "./motion.js";
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
import { highContrastThemes, themes } from "./theme.js";
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

const documentedShadow = (shadows: readonly BoxShadow[]): string => {
  const [shadow] = shadows;
  return shadow === undefined
    ? "`[]`"
    : `\`${shadow.offsetX} ${shadow.offsetY} ${shadow.blurRadius} ${shadow.spreadRadius} ${shadow.color}\``;
};

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
        `| \`${level}\` | ${documentedShadow(lightElevation[level])} | ${documentedShadow(darkElevation[level])} |`,
      );
    });
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

describe("docs/tokens.md status table", () => {
  it("lists every tone with its solid, soft and text roles", () => {
    statusTones.forEach((tone) => {
      expect(markdown, tone).toContain(
        `| \`${tone}\` | \`${tone}\` / \`${tone}Foreground\` | \`${tone}Soft\` | \`${tone}SoftForeground\` | \`${tone}Text\` |`,
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

      expect(surfaces.length, tone).toBe(3);
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

  it("quotes the selection wash strength both modes and both contrasts share", () => {
    const { light, dark } = themes;
    const high = highContrastThemes;

    expect(washPercent(dark.colors.selection)).toBe(
      washPercent(light.colors.selection),
    );
    expect(washPercent(high.dark.colors.selection)).toBe(
      washPercent(high.light.colors.selection),
    );

    const sentence =
      "The wash is translucent (" +
      `${washPercent(light.colors.selection)}% in the default themes, ` +
      `${washPercent(high.light.colors.selection)}% at high contrast), ` +
      "so selected text keeps the foreground's contrast.";
    expect(markdownProse).toContain(sentence);
  });

  it("states the wash strength in both colour tables", () => {
    const cell = (color: string): string =>
      `text selection wash (${washPercent(color)}% alpha; \`selectionColor\`)`;

    expect(markdown).toContain(
      `| \`selection\` | \`${themes.light.colors.selection}\` | \`${themes.dark.colors.selection}\` | ${cell(themes.light.colors.selection)} |`,
    );
    expect(markdown).toContain(
      `| \`selection\` | \`${highContrastThemes.light.colors.selection}\` | \`${highContrastThemes.dark.colors.selection}\` | ${cell(highContrastThemes.light.colors.selection)} |`,
    );
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
});

describe("docs/tokens.md contrast surfaces", () => {
  it("names the washes and the floating surface the contract covers", () => {
    const sentence =
      "The focus ring is measured on the canvas, card and popover and on the `hover`, `active` and `selected` washes, because focus and selection co-occur in rows; status text (`xText`) and the `borderStrong` boundary are also measured on `popover`, so a status label or a control inside a dialog, popover or toast is covered.";
    expect(markdown.replace(/\s+/g, " ")).toContain(sentence);
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
      `| body text on background/card/popover/input | ${contrastFloors.default.body}:1 | ${contrastFloors.high.body}:1 |`,
      `| secondary text (\`mutedForeground\` on plain surfaces), on-colour text, placeholder, ghost text on the \`hover\`/\`active\` washes | ${contrastFloors.default.secondary}:1 | ${contrastFloors.high.secondary}:1 |`,
      `| soft status text (\`xSoftForeground\` on \`xSoft\`) | ${contrastFloors.default.body}:1 | ${contrastFloors.high.body}:1 |`,
      `| status text (\`xText\`) on \`background\`/\`card\`/\`popover\` | ${contrastFloors.default.secondary}:1 | ${contrastFloors.high.secondary}:1 |`,
      `| text selection (\`foreground\` over the composited \`selection\` wash) | ${contrastFloors.default.body}:1 | ${contrastFloors.high.body}:1 |`,
      `| focus ring and essential boundaries, including the ring on the \`hover\`/\`active\`/\`selected\` washes and a control boundary on \`popover\` | ${contrastFloors.default.boundary}:1 | ${contrastFloors.high.boundary}:1 |`,
    ];
    rows.forEach((row) => {
      expect(designSystem.includes(row), row).toBe(true);
    });
  });

  it("states the radius scale", () => {
    const sentence = `Radii: ${radius.none}, ${radius.sm}, ${radius.md}, ${radius.lg}, ${radius.xl}, full.`;
    expect(designSystem.includes(sentence), sentence).toBe(true);
  });
});
