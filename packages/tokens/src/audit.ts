/**
 * The one check a theme runs before it ships.
 *
 * A theme fails silently in independent ways: a role the renderer cannot parse
 * paints black, a shadow colour it cannot parse paints no shadow at all, a
 * number it cannot lay out is dropped, a text pair below its floor is
 * unreadable, a decorative surface close to its background is invisible, a data
 * series is lost on its plot, the selection wash hides the text it selects, an
 * indicator mark disappears into the strip it is drawn on, a disabled control
 * faded by `disabledOpacity` loses its label, and the keyboard dim the runtime
 * paints on every other focusable erases a control's label. Each has its own
 * report, and a consumer who forgets one ships the failure it would have
 * caught — which is what the documented gate did, running two of the three and
 * holding every theme to the default floors even when the theme declares the
 * high-contrast variant.
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
import type { ThemeContrast, ThemeMode } from "./theme.js";
import { typography as shippedTypography } from "./typography.js";

/**
 * The numeric groups a theme must carry. Every other group is additive — a
 * colour role or an elevation level can arrive later and its absence is a report
 * — but a numeric group is a breaking change: the components read every step in
 * it, so a theme stored by a release that predates one is not a theme this
 * library can paint.
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

/**
 * Refuse a theme that is missing a numeric group, naming it.
 *
 * A stored theme is decoded or cast, so the type cannot catch this: without the
 * guard the first report reads `Object.entries(undefined)` and the consumer sees
 * `TypeError: Cannot convert undefined or null to object` with no hint which
 * group their release lost. Throwing is deliberate — this is an invariant of the
 * gate's input rather than a theme state the reports can describe.
 */
const requireGroups = (theme: NumericGroupSource): void => {
  const missing = numericGroups.filter((group) => theme[group] === undefined);
  if (missing.length === 0) {
    return;
  }
  throw new Error(
    `a theme must carry every numeric group: ${missing
      .map((group) => `\`${group}\``)
      .join(", ")} ${
      missing.length === 1 ? "is" : "are"
    } missing. A group is a breaking change, so a theme stored by an older release must be rebuilt from a shipped one with \`extendTheme\`.`,
  );
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
 * `fontFamily: undefined` for a theme missing one, and the batch drops it.
 */
const requiredSteps: readonly RequiredStep[] = [
  ...recordSteps("spacing", spacing),
  ...recordSteps("radius", radius),
  ...recordSteps("borderWidth", borderWidth),
  ...recordSteps("iconSize", iconSize),
  ...Object.entries(shippedTypography).map(
    ([role, value]): RequiredStep =>
      typeof value === "string"
        ? { group: "typography", path: role }
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
 * Refuse a theme that is missing a step of a group it carries, naming every
 * path.
 *
 * The group rule one level up covers a stored theme that predates a whole scale;
 * this covers the theme that predates a step inside it, which fails the same way:
 * `textStyle(theme, "codeBlock")` reads `typography.codeBlock.fontSize`, so an
 * absent role is a `TypeError` at the first paint that asks for it, and an absent
 * `lineHeight` is a property the serialised batch drops, so the role paints at
 * the runtime's leading. Neither is a report — `invalidNumbers` walks the steps a
 * theme carries, so it returns nothing for a step that is not there — which is
 * why the gate refuses the theme instead of passing it. An absent role is named
 * once, rather than once per field it would have carried.
 */
const requireSteps = (theme: NumericGroupSource): void => {
  const missing = requiredSteps.flatMap(({ group, path, fields }) => {
    const step = readPath(theme[group], path);
    if (step === undefined) {
      return [`${group}.${path}`];
    }
    return (fields ?? [])
      .filter((field) => readPath(step, field) === undefined)
      .map((field) => `${group}.${path}.${field}`);
  });
  if (missing.length === 0) {
    return;
  }
  throw new Error(
    `a theme must carry every numeric step: ${missing
      .map((path) => `\`${path}\``)
      .join(", ")} ${
      missing.length === 1 ? "is" : "are"
    } missing. A step is what the components read, so a theme stored by an older release must be rebuilt from a shipped one with \`extendTheme\`.`,
  );
};

/** A theme, or anything shaped like one, for the checks that only read colours. */
type ColourSource = { readonly colors: Partial<ThemeColors> };

/** A theme's contrast variant, when it has declared one. */
type ContrastSource = { readonly contrast?: ThemeContrast };

/** The field the shadow audit reads: the elevation scale a theme paints. */
type ShadowSource = { readonly elevation: Partial<Elevation> };

/** The fields a series audit reads: the mode, the variant and an authored scale. */
type SeriesSource = {
  readonly mode: ThemeMode;
  readonly series?: SeriesColors;
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
  /** Selection washes that cannot be seen, or that hide the text inside them. */
  readonly selection: readonly SelectionFailure[];
  /** Indicator marks that cannot be found on the strip they are drawn on. */
  readonly indicators: readonly IndicatorFailure[];
  /** Disabled controls whose faded label vanishes into the faded fill. */
  readonly disabledFade: readonly DisabledFadeFailure[];
  /** Controls whose label the keyboard dim erases while another control has focus. */
  readonly keyboardDim: readonly KeyboardDimFailure[];
  /** True only when all ten reports are empty. */
  readonly passed: boolean;
}

/**
 * Audit a theme against the ten contracts the library holds itself to.
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
 * predate a colour role or an elevation level the library has added since, so
 * `invalidRoles` and `invalidShadows` name the absence and the contracts that
 * measure a pair report it unmeasurable; `passed` is false either way. A
 * **numeric step** is the one absence the reports cannot describe — the
 * components read every step, and `invalidNumbers` walks the steps a theme
 * carries, so it says nothing about one that is not there while the first paint
 * that asks for it throws — so a theme missing a group, or a step inside one, is
 * refused with an error naming the path. Such a theme must be rebuilt from a
 * shipped one: a step is a breaking change rather than an additive one.
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
    ShadowSource &
    NumberSource,
  floors: ContrastFloors = contrastFloorsFor(theme),
): ThemeAudit {
  requireGroups(theme);
  requireSteps(theme);
  const invalidRoles = invalidColorRoles(theme);
  const invalidShadows = invalidShadowColors(theme);
  const numbers = invalidNumbers(theme);
  const contrast = contrastFailures(theme, floors);
  const decorative = decorativeFailures(theme);
  const series = seriesFailures(theme);
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
      selection.length === 0 &&
      indicators.length === 0 &&
      disabledFade.length === 0 &&
      keyboardDim.length === 0,
  };
}
