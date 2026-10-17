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
 * it, so a value edit cannot ship a document that lies.
 *
 * `node:fs` is used deliberately: this is a documentation test over the tree's
 * own files, and the tokens package ships zero runtime dependencies by design.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { colorRoles } from "./color.js";
import {
  darkElevation,
  lightElevation,
  type BoxShadow,
  type ElevationLevel,
} from "./elevation.js";
import { motion } from "./motion.js";
import {
  avatarSize,
  borderWidth,
  defaultDensity,
  densityPresets,
  iconSize,
  radius,
  spacing,
} from "./scale.js";
import { highContrastThemes, themes } from "./theme.js";
import { typography } from "./typography.js";

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

const documented = documentedRows(markdown);

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
    Object.entries(typography).forEach(([role, style]) => {
      if (typeof style === "string") {
        return;
      }
      expect(markdown, `typography.${role}`).toContain(
        `| \`${role}\` | ${style.fontSize} | ${style.lineHeight} | ${style.fontWeight} |`,
      );
    });
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
