/**
 * The one check a theme runs before it ships.
 *
 * A theme fails silently in independent ways: a role the renderer cannot parse
 * paints black, a shadow colour it cannot parse paints no shadow at all, a
 * number it cannot lay out is dropped, a text pair below its floor is
 * unreadable, a decorative surface close to its background is invisible, a data
 * series is lost on its plot, a code block's syntax token vanishes into the page
 * it is read on, the selection wash hides the text it selects, an indicator mark
 * disappears into the strip it is drawn on, a disabled control faded by
 * `disabledOpacity` loses its label, and the keyboard dim the runtime paints on
 * every other focusable erases a control's label. Each has its own report, and a
 * consumer who forgets one ships the failure it would have caught — which is
 * what the documented gate did, running two of the three and holding every theme
 * to the default floors even when the theme declares the high-contrast variant.
 */

import {
  invalidColorRoles,
  type InvalidColorRole,
  type ThemeColors,
} from "./color.js";
import {
  contrastFailures,
  contrastFloorsFor,
  type ContrastFailure,
  type ContrastFloors,
} from "./contrast.js";
import { decorativeFailures, type DecorativeFailure } from "./decorative.js";
import { disabledFadeFailures, type DisabledFadeFailure } from "./disabled.js";
import {
  invalidShadowColors,
  type Elevation,
  type InvalidShadowColor,
} from "./elevation.js";
import { keyboardDimFailures, type KeyboardDimFailure } from "./focus-dim.js";
import { indicatorFailures, type IndicatorFailure } from "./indicator.js";
import {
  invalidNumbers,
  type InvalidNumber,
  type NumberSource,
} from "./numbers.js";
import {
  borderWidth,
  defaultDensity,
  iconSize,
  radius,
  spacing,
} from "./scale.js";
import { selectionFailures, type SelectionFailure } from "./selection.js";
import {
  seriesFailures,
  type SeriesColors,
  type SeriesReport,
} from "./series.js";
import {
  syntaxFailures,
  type SyntaxColors,
  type SyntaxFailure,
} from "./syntax.js";
import type { ThemeContrast, ThemeMode } from "./theme.js";
import { typography as shippedTypography } from "./typography.js";

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
 * catching the gate's error. A group the theme does not carry is named **once**:
 * none of its steps exists to name, so listing them would bury the one decision
 * the reader has to make. A step is named once too, rather than once per field
 * it would have carried. **Absence is both of the shapes a store writes**: a key
 * it dropped (`undefined`) and a key it kept without a value (`null`). A token is
 * never nullable, so both are the step the gate must refuse — reading only
 * `undefined` let `{ spacing: { md: null } }` pass the gate while the runtime
 * dropped the length and the gap painted as nothing.
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
 * const stored = JSON.parse(fromStorage) as typeof lightTheme;
 * missingTokens(stored);
 * // [
 * //   { group: "density", path: "rowHeight", kind: "step" },
 * //   { group: "typography", path: "sans", kind: "family" },
 * // ]
 * ```
 */
export function missingTokens(
  theme: NumericGroupSource,
): readonly MissingToken[] {
  const carries = (group: MissingToken["group"]): boolean =>
    !isAbsent(theme[group]);
  const groups = numericGroups
    .filter((group) => !carries(group))
    .map((group): MissingToken => ({ group, path: "", kind: "group" }));
  const steps = requiredSteps.flatMap(({ group, path, fields }) => {
    if (!carries(group)) {
      return [];
    }
    const step = readPath(theme[group], path);
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
    const value = readPath(theme[group], path);
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
 * Refuse a theme that is missing a numeric part, naming it.
 *
 * A stored theme is decoded or cast, so the type cannot catch this: without the
 * guard the first report reads `Object.entries(undefined)` and the consumer sees
 * `TypeError: Cannot convert undefined or null to object` with no hint which
 * group their release lost. Throwing is deliberate — this is an invariant of the
 * gate's input rather than a theme state the reports can describe — and the same
 * three lists are readable without the throw through {@link missingTokens}.
 */
const requireTokens = (theme: NumericGroupSource): void => {
  const missing = missingTokens(theme);
  const groups = missing.filter(({ kind }) => kind === "group");
  if (groups.length > 0) {
    throw new Error(
      `a theme must carry every numeric group: ${tokenNames(groups)} ${
        groups.length === 1 ? "is" : "are"
      } missing. A group is a breaking change, so a theme stored by an older release must be rebuilt from a shipped one with \`extendTheme\`.`,
    );
  }
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

/** A theme, or anything shaped like one, for the checks that only read colours. */
type ColourSource = { readonly colors: Partial<ThemeColors> };

/** A theme's contrast variant, when it has declared one. */
type ContrastSource = { readonly contrast?: ThemeContrast };

/** The field the shadow audit reads: the elevation scale a theme paints, if it carries one. */
type ShadowSource = { readonly elevation?: Partial<Elevation> };

/** The fields a series audit reads: the mode, the variant and an authored scale. */
type SeriesSource = {
  readonly mode: ThemeMode;
  readonly series?: SeriesColors;
};

/** The fields a syntax audit reads: the mode and an authored palette. */
type SyntaxSource = {
  readonly mode: ThemeMode;
  readonly syntax?: SyntaxColors;
};

/** Everything a theme must be free of before it ships. */
export interface ThemeAudit {
  /** Roles whose value is not a colour GPUix can paint. */
  readonly invalidRoles: readonly InvalidColorRole[];
  /** Elevation shadows whose colour GPUix cannot paint, by level and position. */
  readonly invalidShadows: readonly InvalidShadowColor[];
  /** Numeric tokens the renderer cannot lay out — a dropped or invisible size. */
  readonly invalidNumbers: readonly InvalidNumber[];
  /** Text, icon and boundary pairs that miss their floor, or cannot be measured. */
  readonly contrast: readonly ContrastFailure[];
  /** Dividers, skeleton fills, veils and status edges too close to their surface. */
  readonly decorative: readonly DecorativeFailure[];
  /** Data series too close to a plot surface, to each other, or to one another under a colour-vision deficiency. */
  readonly series: SeriesReport;
  /** Syntax token colours that cannot be read on the fill a code host paints. */
  readonly syntax: readonly SyntaxFailure[];
  /** Selection washes that cannot be seen, or that hide the text inside them. */
  readonly selection: readonly SelectionFailure[];
  /** Indicator marks that cannot be found on the strip they are drawn on. */
  readonly indicators: readonly IndicatorFailure[];
  /** Disabled controls whose faded label vanishes into the faded fill. */
  readonly disabledFade: readonly DisabledFadeFailure[];
  /** Controls whose label the keyboard dim erases while another control has focus. */
  readonly keyboardDim: readonly KeyboardDimFailure[];
  /** True only when all eleven reports are empty. */
  readonly passed: boolean;
}

/**
 * Audit a theme against the eleven contracts the library holds itself to.
 *
 * The contrast floors come from the theme's own `contrast` variant, so a
 * high-contrast brand is measured at AAA without the caller naming a floor set;
 * pass `floors` to hold a theme to a different contract. Two reports do not
 * take them: `disabledFadeFailures` measures a mechanism rather than a
 * readability claim, and holds every variant to the same
 * `contrastFloors.disabled` — the fade cannot reach a high-contrast variant's
 * 3:1, which is why that variant paints the role pair instead; and
 * `keyboardDimFailures` holds every variant to `decorativeFloor` (1.05:1),
 * because the dim is a where-can-Tab-go cue rather than a reading mode.
 *
 * An incomplete theme does not crash the gate. A theme restored from storage can
 * predate a colour role, an elevation level or the whole elevation scale the
 * library has added since, so `invalidRoles` and `invalidShadows` name the
 * absence and the contracts that measure a pair report it unmeasurable; `passed`
 * is false either way. A
 * **numeric step** is the one absence the reports cannot describe — the
 * components read every step, and `invalidNumbers` walks the steps a theme
 * carries, so it says nothing about one that is not there while the first paint
 * that asks for it throws — so a theme missing a group, or a step inside one, is
 * refused with an error naming the path. A font family is refused the same way:
 * it is present but **blank**, so no report can measure it, while every text
 * role paints the renderer's fallback instead of the face the theme names. Such
 * a theme must be rebuilt from a shipped one: a step is a breaking change rather
 * than an additive one. All three lists are readable **before** the refusal with
 * {@link missingTokens}, so a caller deciding whether to restore a stored theme
 * reads the absence as data instead of catching this function's error.
 *
 * `passed` is the only passing result — a report nobody checked is not a pass.
 *
 * @example
 * ```ts
 * import { auditTheme, extendTheme, lightTheme } from "@gpuixui/tokens";
 *
 * const brand = extendTheme(lightTheme, { colors: { primary: "#6A45F0" } });
 * auditTheme(brand).passed; // true
 * ```
 */
export function auditTheme(
  theme: ColourSource &
    ContrastSource &
    SeriesSource &
    SyntaxSource &
    ShadowSource &
    NumberSource,
  floors: ContrastFloors = contrastFloorsFor(theme),
): ThemeAudit {
  requireTokens(theme);
  const invalidRoles = invalidColorRoles(theme);
  const invalidShadows = invalidShadowColors(theme);
  const numbers = invalidNumbers(theme);
  const contrast = contrastFailures(theme, floors);
  const decorative = decorativeFailures(theme);
  const series = seriesFailures(theme);
  const syntax = syntaxFailures(theme, floors);
  const selection = selectionFailures(theme, floors);
  const indicators = indicatorFailures(theme, floors);
  const disabledFade = disabledFadeFailures(theme);
  const keyboardDim = keyboardDimFailures(theme);
  return {
    invalidRoles,
    invalidShadows,
    invalidNumbers: numbers,
    contrast,
    decorative,
    series,
    syntax,
    selection,
    indicators,
    disabledFade,
    keyboardDim,
    passed:
      invalidRoles.length === 0 &&
      invalidShadows.length === 0 &&
      numbers.length === 0 &&
      contrast.length === 0 &&
      decorative.length === 0 &&
      series.surfaces.length === 0 &&
      series.distinctness.length === 0 &&
      series.deficiencies.length === 0 &&
      syntax.length === 0 &&
      selection.length === 0 &&
      indicators.length === 0 &&
      disabledFade.length === 0 &&
      keyboardDim.length === 0,
  };
}
