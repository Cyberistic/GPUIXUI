/**
 * The numeric parts a theme must carry, and the refusal a theme that lost one
 * earns.
 *
 * This is the presence rule every contract that reads a numeric group shares.
 * The gate runs it before its reports (`auditTheme`), and each numeric report
 * report runs it too: `invalidNumbers` and `invalidScales` walk the groups a
 * theme carries, so a stored theme that lost a whole group used to fail inside
 * the walk with `TypeError: Cannot convert undefined or null to object` — a
 * message naming neither the group nor the release it predates, from a function
 * whose sister reports describe what they cannot measure. Absence is not a
 * report here because no report can describe it: a component reads these steps
 * by name.
 *
 * The lists are data first — {@link missingTokens} returns them, tagged by kind
 * — and the refusals are built from that same list, so the report and the error
 * cannot drift.
 */

import { typography as shippedTypography } from "./typography.js";
import {
  borderWidth,
  defaultDensity,
  iconSize,
  radius,
  spacing,
} from "./scale.js";

/**
 * The numeric groups a theme must carry. Every other group is additive: a colour
 * role, an elevation level or the whole elevation scale can arrive later, and its
 * absence is a report. A numeric group is different — the components read every
 * step in it, so a theme stored by a release that predates one is not a theme
 * this library can paint.
 */
const numericGroups = [
  "spacing",
  "radius",
  "borderWidth",
  "iconSize",
  "typography",
  "density",
] as const;

/** A theme indexed by its numeric groups — what the presence checks read. */
type NumericGroupSource = {
  readonly [group in (typeof numericGroups)[number]]?: unknown;
};

/** One token a numeric group must carry: `spacing.md`, `typography.body`. */
interface RequiredStep {
  /** The group it lives in. */
  readonly group: (typeof numericGroups)[number];
  /** Its path inside that group. */
  readonly path: string;
  /**
   * The fields it must carry once it is there — a type role's numbers. Absent
   * for a token that is a value, such as a spacing step or a font family.
   */
  readonly fields?: readonly string[];
  /**
   * A font family, which is a **name** rather than a value: it has to be there
   * and it has to say something.
   */
  readonly family?: boolean;
}

/** Every key of a flat record of tokens, with an optional nesting prefix. */
const recordSteps = (
  group: RequiredStep["group"],
  record: object,
  prefix = "",
): readonly RequiredStep[] =>
  Object.keys(record).map((key) => ({ group, path: `${prefix}${key}` }));

/**
 * Every step a theme must carry, derived from the scales this release ships, so
 * a step added to one is required on the next release without a second list to
 * edit. The families are steps too: `textStyle` hands the runtime
 * `fontFamily: undefined` for a theme missing one, and the batch drops it — and
 * an empty one names no face, so the renderer's fallback paints instead.
 */
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

/**
 * A stored value as a group source: the object it is, or an empty one when the
 * store wrote no theme at all. `missingTokens` is the report a caller runs
 * **before** it trusts a decoded value, so a `null` (no saved theme), a string
 * from a corrupt row or a number carries no group rather than throwing out of
 * the decision the report exists to answer.
 */
const groupSource = (theme: unknown): NumericGroupSource =>
  isRecord(theme) ? theme : {};

/** The value at a dotted `path`, or `undefined` when a key on the way is absent. */
const readPath = (source: unknown, path: string): unknown =>
  path
    .split(".")
    .reduce<unknown>(
      (value, key) =>
        isRecord(value) && key in value ? value[key] : undefined,
      source,
    );

/**
 * Whether a stored value is the absence it is rather than a token: a key a store
 * dropped reads as `undefined`, and one it kept without a value reads as `null`.
 * A token is never nullable, so both are the same absence to the gate.
 */
const isAbsent = (value: unknown): boolean =>
  value === undefined || value === null;

/**
 * Why a numeric part of a theme is absent: a whole group, a step inside one, or
 * a family that is present but names no face.
 */
export type MissingTokenKind = "group" | "step" | "family";

/**
 * A numeric part a theme does not carry.
 *
 * The three kinds are the three refusals {@link auditTheme} makes, because they
 * are the three absences no report can describe: a report walks what a theme
 * carries, and a component reads these by name.
 */
export interface MissingToken {
  /** The group it belongs to, so a failure names the scale that is incomplete. */
  readonly group: (typeof numericGroups)[number];
  /**
   * Its path inside that group — `md` for `spacing.md`, `body.lineHeight` for
   * `typography.body.lineHeight`, `sans` for a blank `typography.sans` — and an
   * empty string when the whole group is what is missing.
   */
  readonly path: string;
  /** What is absent: the group, a step in it, or the name a family would state. */
  readonly kind: MissingTokenKind;
}

/**
 * Every numeric part a theme does not carry, as data.
 *
 * This is the list {@link auditTheme} refuses a theme over, before the refusal:
 * a stored theme is decoded or cast, so the type cannot say whether it predates
 * a scale, a step or a family this release ships, and a caller deciding whether
 * to restore it — or which release it came from — reads the absence instead of
 * catching the gate's error. **The source is `unknown`**, because that is what a
 * store hands back: a decoded value a caller cannot narrow without a cast, and
 * the `null` a store writes for no saved theme at all. A value that is not an
 * object — `null`, `undefined`, a string from a corrupt row, a number — carries
 * no group, so it answers every group missing instead of throwing out of the
 * decision this report exists to answer. A group the theme does not carry is
 * named **once**: none of its steps exists to name, so listing them would bury
 * the one decision the reader has to make. A step is named once too, rather than
 * once per field it would have carried. **Absence is both of the shapes a store
 * writes**: a key it dropped (`undefined`) and a key it kept without a value
 * (`null`). A token is never nullable, so both are the step the gate must
 * refuse — reading only `undefined` let `{ spacing: { md: null } }` pass the
 * gate while the runtime dropped the length and the gap painted as nothing.
 *
 * An **additive** absence is not here: a colour role, an elevation level or the
 * whole elevation scale a theme lost is a report (`invalidColorRoles`,
 * `invalidShadowColors`) and a failing gate, because the runtime can paint the
 * rest. Only a numeric group, a step inside one and a blank family are refusals,
 * because every component reads
 * them by name.
 *
 * @example
 * ```ts
 * import { lightTheme, missingTokens } from "@gpuixui/tokens";
 *
 * missingTokens(lightTheme); // [] — a shipped theme carries every part
 * const stored: unknown = JSON.parse(fromStorage);
 * missingTokens(stored);
 * // [
 * //   { group: "density", path: "rowHeight", kind: "step" },
 * //   { group: "typography", path: "sans", kind: "family" },
 * // ]
 * ```
 */
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
    // An absent family is the step rule's; this is the one a store wrote as a
    // present but empty name.
    return isAbsent(value) || (typeof value === "string" && value.trim() !== "")
      ? []
      : [{ group, path, kind: "family" as const }];
  });
  return [...groups, ...steps, ...families];
}

/** The dotted names of missing parts, as the gate's message prints them. */
const tokenNames = (missing: readonly MissingToken[]): string =>
  missing
    .map(({ group, path }) => `\`${path === "" ? group : `${group}.${path}`}\``)
    .join(", ");

/**
 * Refuse a theme that lost a whole numeric group, naming every one it lost.
 *
 * A report walks the steps of a group; a group that is not there has no steps to
 * walk, so this is the one absence a report cannot describe and must not read
 * through — `invalidNumbers` and `invalidScales` open every group they inspect
 * and would otherwise throw the runtime's `TypeError: Cannot convert undefined
 * or null to object`, which names neither the group nor what it means. The
 * message is the gate's, so a caller who runs one report directly reads the same
 * sentence `auditTheme` refuses with.
 */
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

/** {@link refuseGroups} for a theme, which a numeric report runs before its walk. */
export const requireGroups = (theme: unknown): void =>
  refuseGroups(missingTokens(theme));

/**
 * Refuse a theme that is missing a numeric part, naming it.
 *
 * A stored theme is decoded or cast, so the type cannot catch this: without the
 * guard the first report reads `Object.entries(undefined)` and the consumer sees
 * `TypeError: Cannot convert undefined or null to object` with no hint which
 * group their release lost. The source is `unknown` for the reason
 * {@link missingTokens} takes one — this is the refusal a caller runs on the
 * value a store handed back, so a `null` is every group missing rather than a
 * `TypeError` from the guard itself. Throwing is deliberate — this is an
 * invariant of the gate's input rather than a theme state the reports can
 * describe — and the same three lists are readable without the throw through
 * {@link missingTokens}.
 */
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
