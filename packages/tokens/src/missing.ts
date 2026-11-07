import { typography as shippedTypography } from "./typography.js";
import {
  borderWidth,
  defaultDensity,
  iconSize,
  radius,
  spacing,
} from "./scale.js";

const numericGroups = [
  "spacing",
  "radius",
  "borderWidth",
  "iconSize",
  "typography",
  "density",
] as const;

type NumericGroupSource = {
  readonly [group in (typeof numericGroups)[number]]?: unknown;
};

interface RequiredStep {
  readonly group: (typeof numericGroups)[number];

  readonly path: string;

  readonly fields?: readonly string[];

  readonly family?: boolean;
}

const recordSteps = (
  group: RequiredStep["group"],
  record: object,
  prefix = "",
): readonly RequiredStep[] =>
  Object.keys(record).map((key) => ({ group, path: `${prefix}${key}` }));

const requiredSteps: readonly RequiredStep[] = [
  ...recordSteps("spacing", spacing),
  ...recordSteps("radius", radius),
  ...recordSteps("borderWidth", borderWidth),
  ...recordSteps("iconSize", iconSize),
  ...Object.entries(shippedTypography).map(
    ([role, value]): RequiredStep =>
      typeof value === "string"
        ? { group: "typography", path: role, family: true }
        : { group: "typography", path: role, fields: Object.keys(value) },
  ),
  ...recordSteps("density", defaultDensity.controlHeight, "controlHeight."),
  ...recordSteps("density", defaultDensity.controlPaddingX, "controlPaddingX."),
  { group: "density", path: "rowHeight" },
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const isStepRecord = (
  scale: unknown,
): scale is Readonly<Record<string, unknown>> =>
  typeof scale === "object" && scale !== null && !Array.isArray(scale);

const groupSource = (theme: unknown): NumericGroupSource =>
  isRecord(theme) ? theme : {};

const readPath = (source: unknown, path: string): unknown =>
  path
    .split(".")
    .reduce<unknown>(
      (value, key) =>
        isRecord(value) && key in value ? value[key] : undefined,
      source,
    );

const isAbsent = (value: unknown): boolean =>
  value === undefined || value === null;

export type MissingTokenKind = "group" | "step" | "family";

export interface MissingToken {
  readonly group: (typeof numericGroups)[number];

  readonly path: string;

  readonly kind: MissingTokenKind;
}

export function missingTokens(theme: unknown): readonly MissingToken[] {
  const source = groupSource(theme);
  const carries = (group: MissingToken["group"]): boolean =>
    !isAbsent(source[group]);
  const groups = numericGroups
    .filter((group) => !carries(group))
    .map((group): MissingToken => ({ group, path: "", kind: "group" }));
  const steps = requiredSteps.flatMap(({ group, path, fields }) => {
    if (!carries(group)) {
      return [];
    }
    const step = readPath(source[group], path);
    if (isAbsent(step)) {
      return [{ group, path, kind: "step" as const }];
    }
    return (fields ?? [])
      .filter((field) => isAbsent(readPath(step, field)))
      .map((field) => ({
        group,
        path: `${path}.${field}`,
        kind: "step" as const,
      }));
  });
  const families = requiredSteps.flatMap(({ group, path, family }) => {
    if (family !== true || !carries(group)) {
      return [];
    }
    const value = readPath(source[group], path);

    return isAbsent(value) || (typeof value === "string" && value.trim() !== "")
      ? []
      : [{ group, path, kind: "family" as const }];
  });
  return [...groups, ...steps, ...families];
}

const tokenNames = (missing: readonly MissingToken[]): string =>
  missing
    .map(({ group, path }) => `\`${path === "" ? group : `${group}.${path}`}\``)
    .join(", ");

const refuseGroups = (missing: readonly MissingToken[]): void => {
  const groups = missing.filter(({ kind }) => kind === "group");
  if (groups.length > 0) {
    throw new Error(
      `a theme must carry every numeric group: ${tokenNames(groups)} ${
        groups.length === 1 ? "is" : "are"
      } missing. A group is a breaking change, so a theme stored by an older release must be rebuilt from a shipped one with \`extendTheme\`.`,
    );
  }
};

export const requireGroups = (theme: unknown): void =>
  refuseGroups(missingTokens(theme));

export const requireTokens = (theme: unknown): void => {
  const missing = missingTokens(theme);
  refuseGroups(missing);
  const steps = missing.filter(({ kind }) => kind === "step");
  if (steps.length > 0) {
    throw new Error(
      `a theme must carry every numeric step: ${tokenNames(steps)} ${
        steps.length === 1 ? "is" : "are"
      } missing. A step is what the components read, so a theme stored by an older release must be rebuilt from a shipped one with \`extendTheme\`.`,
    );
  }
  const families = missing.filter(({ kind }) => kind === "family");
  if (families.length > 0) {
    throw new Error(
      `a theme must name every font family: ${tokenNames(families)} ${
        families.length === 1 ? "is" : "are"
      } blank. A family is the face every text role is laid out in, so an empty one paints the renderer's fallback instead of the theme — a theme stored without it must be rebuilt from a shipped one with \`extendTheme\`.`,
    );
  }
};
