import {
  platformStyles,
  radiusSteps,
  type PlatformName,
  type PlatformStyle,
} from "@gpuixui/tokens";

/**
 * A shipped platform style as the file a consumer edits.
 *
 * `MISSION.md` asks that a reader can take one platform style, change any value
 * and ship their own look. The page taught `applyStyle` over a hand-written
 * sample and named the table, but the table itself lives in the repository, so
 * the site gave a reader nothing to copy. The source is generated from
 * `platformStyles` rather than typed here: a role the library changes moves the
 * block, and `platform-style-source.test.ts` evaluates what this module prints
 * and compares it with the table, so a dropped field fails the suite.
 */

/** The keys an object literal may print bare; anything else is quoted. */
const identifier = /^[A-Za-z_$][\w$]*$/;

const pad = (depth: number): string => "  ".repeat(depth);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** A value as TypeScript, indented for the depth it sits at. */
const literal = (value: unknown, depth: number): string => {
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const entries = value.map(
      (entry) => `${pad(depth + 1)}${literal(entry, depth + 1)},`,
    );
    return `[\n${entries.join("\n")}\n${pad(depth)}]`;
  }
  if (isRecord(value)) {
    const entries = Object.entries(value).filter(
      ([, entry]) => entry !== undefined,
    );
    if (entries.length === 0) return "{}";
    const fields = entries.map(
      ([key, entry]) =>
        `${pad(depth + 1)}${
          identifier.test(key) ? key : JSON.stringify(key)
        }: ${literal(entry, depth + 1)},`,
    );
    return `{\n${fields.join("\n")}\n${pad(depth)}}`;
  }
  throw new Error(
    `a platform style carries a value source cannot print: ${typeof value}`,
  );
};

/**
 * The style's own fields in the order a reader edits them: what the platform is
 * called and what it types in, then the geometry, then the paints. Optional
 * fields a style does not declare are absent rather than printed as `undefined`
 * — `default` carries no switch, scale or syntax table, and a copy that printed
 * one would not mean what the library means.
 */
const fieldsOf = (style: PlatformStyle): Record<string, unknown> => {
  const ordered: Record<string, unknown> = {
    label: style.label,
    sans: style.sans,
    mono: style.mono,
    radius: Object.fromEntries(
      radiusSteps.map((step) => [step, style.radius[step]]),
    ),
    density: style.density,
    contrast: style.contrast,
    colors: style.colors,
  };
  if (style.switch !== undefined) ordered.switch = style.switch;
  if (style.switchMetrics !== undefined) {
    ordered.switchMetrics = style.switchMetrics;
  }
  if (style.series !== undefined) ordered.series = style.series;
  if (style.syntax !== undefined) ordered.syntax = style.syntax;
  return ordered;
};

/** The literal body of a style, at the depth its declaration sits at. */
export const platformStyleLiteral = (style: PlatformStyle): string =>
  literal(fieldsOf(style), 0);

/** The file a reader copies for one platform, ready to paste and edit. */
export const platformStyleSource = (name: PlatformName): string => {
  const style = platformStyles[name];

  return `import type { PlatformStyle } from "@gpuixui/tokens";

/**
 * ${style.label} — copied from \`platformStyles.${name}\` in
 * \`@gpuixui/tokens\`. Edit any value and ship it:
 *
 *   const theme = applyStyle(themes.light, myStyle);
 *
 * A role you delete keeps the base theme's value. Run \`auditTheme(theme)\`
 * before shipping.
 */
export const myStyle: PlatformStyle = ${platformStyleLiteral(style)};
`;
};
