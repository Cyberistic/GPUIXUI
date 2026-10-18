/**
 * The numeric half of the theme contract.
 *
 * {@link themeContrastFailures} holds an edited theme's colours to the floors
 * the shipped sets pass; this module holds its metrics — type, spacing, radii,
 * density, dimensions, elevation, motion, borders, icons and avatars — to the
 * invariants the components rely on. A rule is here because a value that breaks
 * it makes a metric or a control unusable, not because it is a house style.
 *
 * Every rule is a pure predicate over a `Theme`, so the check a consumer runs in
 * their suite is the one this package runs on every shipped theme, platform
 * variant and recipe.
 */

import type { MotionEasing } from "./motion.js";
import { controlSizes } from "./scale.js";
import type { Theme } from "./theme.js";
import {
  codeLadder,
  proseLadder,
  textRoles,
  type TextRole,
  type Typography,
} from "./typography.js";

/** The ordered index of metric groups the contract governs. */
export const metricGroups = [
  "typography",
  "borderWidth",
  "density",
  "dimensions",
  "iconSize",
  "avatarSize",
  "radius",
  "spacing",
  "elevation",
  "motion",
] as const;

/** A group of theme metrics the contract governs. */
export type MetricGroup = (typeof metricGroups)[number];

/** The rule a metric missed. */
export type MetricRule =
  | "positive"
  | "non-negative"
  | "zero"
  | "finite"
  | "increasing"
  | "non-decreasing"
  | "at-least"
  | "at-most"
  | "within";

/** One metric that misses a rule in a theme. */
export interface MetricFailure {
  /** The theme group the governed member belongs to. */
  readonly group: MetricGroup;
  /** The member, dotted the way the documentation names it — `controlHeight.sm`. */
  readonly member: string;
  /** The rule the value broke. */
  readonly rule: MetricRule;
  /** The value measured. */
  readonly actual: number;
  /** The value it was compared with. */
  readonly bound: number;
}

const failure = (
  group: MetricGroup,
  member: string,
  rule: MetricRule,
  actual: number,
  bound: number,
): MetricFailure => ({ group, member, rule, actual, bound });

const positive = (
  group: MetricGroup,
  member: string,
  actual: number,
): ReadonlyArray<MetricFailure> =>
  actual > 0 ? [] : [failure(group, member, "positive", actual, 0)];

const nonNegative = (
  group: MetricGroup,
  member: string,
  actual: number,
): ReadonlyArray<MetricFailure> =>
  actual >= 0 ? [] : [failure(group, member, "non-negative", actual, 0)];

const zero = (
  group: MetricGroup,
  member: string,
  actual: number,
): ReadonlyArray<MetricFailure> =>
  actual === 0 ? [] : [failure(group, member, "zero", actual, 0)];

/**
 * A value the renderer can paint. `NaN` and the infinities are numbers no
 * `StyleDesc` accepts, so a shadow carrying one paints nothing — the same
 * silent loss as a zero focus-ring spread, one metric group over. A negative
 * offset or spread is a direction and stays valid; only finiteness is checked.
 */
const finite = (
  group: MetricGroup,
  member: string,
  actual: number,
): ReadonlyArray<MetricFailure> =>
  Number.isFinite(actual) ? [] : [failure(group, member, "finite", actual, 0)];

const atLeast = (
  group: MetricGroup,
  member: string,
  actual: number,
  bound: number,
): ReadonlyArray<MetricFailure> =>
  actual >= bound ? [] : [failure(group, member, "at-least", actual, bound)];

const atMost = (
  group: MetricGroup,
  member: string,
  actual: number,
  bound: number,
): ReadonlyArray<MetricFailure> =>
  actual <= bound ? [] : [failure(group, member, "at-most", actual, bound)];

/**
 * An elevation alpha is a fraction, and `alpha()` falls back to the tint
 * unchanged on a value it cannot parse, so a `NaN` or an out-of-range alpha
 * would paint an opaque shadow.
 */
const fraction = (
  group: MetricGroup,
  member: string,
  actual: number,
): ReadonlyArray<MetricFailure> =>
  Number.isFinite(actual) && actual >= 0 && actual <= 1
    ? []
    : [failure(group, member, "within", actual, 1)];

/**
 * A cubic-bezier easing the renderer can interpolate. The pinned `MotionEase`
 * accepts four plain numbers, but the runtime's `validate_ease` rejects a
 * transition whose control point is not finite or whose x value falls outside
 * `0…1`, and a curve outside that range has no progress function. A y value may
 * overshoot — a spring-like curve is a design choice, not breakage — so only the
 * two x values take the `within` rule. A named easing is constrained by
 * `MotionEasing` itself.
 */
const easing = (
  group: MetricGroup,
  phase: string,
  value: MotionEasing,
): ReadonlyArray<MetricFailure> =>
  typeof value === "string"
    ? []
    : [
        ...fraction(group, `ease.${phase}[0]`, value[0]),
        ...finite(group, `ease.${phase}[1]`, value[1]),
        ...fraction(group, `ease.${phase}[2]`, value[2]),
        ...finite(group, `ease.${phase}[3]`, value[3]),
      ];

/**
 * A ladder of named steps. Every step must be a non-negative number and, from
 * the second on, step past the one before it — or reach it, for a
 * `non-decreasing` ladder, because several shipped styles share a step (Linux
 * and Windows ship `radius.lg === radius.xl`; Windows ships
 * `motion.fast === motion.step`).
 */
const ladder = (
  group: MetricGroup,
  steps: ReadonlyArray<readonly [string, number]>,
  rule: "increasing" | "non-decreasing",
): ReadonlyArray<MetricFailure> =>
  steps.flatMap(([member, value], index) => {
    const previous = steps[index - 1];
    if (previous === undefined) {
      return nonNegative(group, member, value);
    }
    const ok =
      rule === "increasing" ? value > previous[1] : value >= previous[1];
    return [
      ...nonNegative(group, member, value),
      ...(ok ? [] : [failure(group, member, rule, value, previous[1])]),
    ];
  });

/**
 * Every member of a group must be a number the renderer can paint. A ladder's
 * last step and a standalone metric have no later rule to catch an infinity, so
 * the check is its own pass.
 */
const finiteMembers = (
  group: MetricGroup,
  members: ReadonlyArray<readonly [string, number]>,
): ReadonlyArray<MetricFailure> =>
  members.flatMap(([member, value]) => finite(group, member, value));

/**
 * A documented size ladder walked from its smallest step upwards, because the
 * `ladder` rule steps up and the docs list each ladder largest first.
 */
const ascendingSizes = (
  ladder: ReadonlyArray<TextRole>,
  typography: Typography,
): ReadonlyArray<readonly [string, number]> =>
  ladder
    .toReversed()
    .map((role) => [`${role}.fontSize`, typography[role].fontSize] as const);

/**
 * Every numeric rule a theme misses.
 *
 * - **typography**: a role needs a size and leading, and a line box shorter
 *   than its type clips the glyphs. The two documented size ladders — prose
 *   {@link proseLadder} and code {@link codeLadder} — may not be inverted, and
 *   `bodyStrong` is the weight variant of `body`: it may not shrink below it and
 *   must stay heavier, or emphasis is indistinguishable from body text.
 * - **borderWidth**: `strong` is the focus ring's spread, and the ring is the
 *   only focus indicator the runtime can draw, so it may not be zero; `thin`
 *   may be zero in a borderless theme, so it is only non-negative.
 * - **density**: sizes and padding are ladders, the smallest control fits one
 *   label line plus its two borders, and a row fits one body line and the
 *   default `md` control it holds.
 * - **dimensions**: every surface metric is positive, each documented range has
 *   a minimum below its default, an adornment fits the smallest control, a chip
 *   fits in a field, and the overlay scroll height fits one row — a list
 *   viewport shorter than a row clips every option.
 * - **iconSize**, **avatarSize**: named ladders, and the default icon fits the
 *   smallest control.
 * - **radius**: `none` is square, the four steps are a ladder, and `full` rounds
 *   the largest radius, half the largest control and half the largest avatar —
 *   a 40px avatar at a smaller radius is a rounded square.
 * - **spacing**: a ladder.
 * - **elevation**: `sm`/`md`/`lg` each hold a shadow whose two offsets, blur and
 *   spread are finite, whose blur is non-negative, and whose alpha is a
 *   fraction. `overlay` ships reserved and empty, and an empty level is exempt;
 *   a level a consumer defines — `overlay` included — is held to the same
 *   rules, because `elevationShadow` will paint it.
 * - **motion**: `none` is zero, the timings are a finite non-decreasing ladder,
 *   and a cubic-bezier easing holds four finite control points with both x
 *   values inside `0…1` — the runtime rejects the whole transition otherwise. A
 *   y value may overshoot; an easing named by `MotionEasing` is constrained by
 *   the type.
 *
 * The level is not a parameter: these rules are the same at every contrast
 * setting, because they describe shapes, not colour. Every numeric member of
 * every group must also be **finite**: the renderer casts each one to a 32-bit
 * float, and an infinity becomes invalid layout it paints as nothing, silently.
 * `elevation` and `motion` carry that rule in their own groups (plans 360 and
 * 364); this function applies it to the other eight.
 *
 * @example
 * ```ts
 * import { extendTheme, getTheme, themeMetricFailures } from "@gpuixui/tokens";
 *
 * const ringless = extendTheme(getTheme("dark"), {
 *   borderWidth: { strong: 0 },
 * });
 * themeMetricFailures(ringless); // [{ group: "borderWidth", member: "strong", … }]
 * ```
 */
export function themeMetricFailures(
  theme: Theme,
): ReadonlyArray<MetricFailure> {
  const {
    typography,
    borderWidth,
    density,
    dimensions,
    iconSize,
    avatarSize,
    radius,
    spacing,
    elevation,
    motion,
  } = theme;
  return [
    ...finiteMembers(
      "typography",
      textRoles.flatMap((role) => [
        [`${role}.fontSize`, typography[role].fontSize] as const,
        [`${role}.lineHeight`, typography[role].lineHeight] as const,
      ]),
    ),
    ...textRoles.flatMap((role) => [
      ...positive("typography", `${role}.fontSize`, typography[role].fontSize),
      ...atLeast(
        "typography",
        `${role}.lineHeight`,
        typography[role].lineHeight,
        typography[role].fontSize,
      ),
    ]),
    ...ladder(
      "typography",
      ascendingSizes(proseLadder, typography),
      "non-decreasing",
    ),
    ...ladder(
      "typography",
      ascendingSizes(codeLadder, typography),
      "non-decreasing",
    ),
    ...ladder(
      "typography",
      [
        ["body.fontSize", typography.body.fontSize],
        ["bodyStrong.fontSize", typography.bodyStrong.fontSize],
      ],
      "non-decreasing",
    ),
    ...ladder(
      "typography",
      [
        ["body.fontWeight", typography.body.fontWeight],
        ["bodyStrong.fontWeight", typography.bodyStrong.fontWeight],
      ],
      "increasing",
    ),
    ...finiteMembers("borderWidth", [
      ["thin", borderWidth.thin],
      ["strong", borderWidth.strong],
    ]),
    ...nonNegative("borderWidth", "thin", borderWidth.thin),
    ...positive("borderWidth", "strong", borderWidth.strong),
    ...finiteMembers("density", [
      ...controlSizes.map(
        (size) =>
          [`controlHeight.${size}`, density.controlHeight[size]] as const,
      ),
      ...controlSizes.map(
        (size) =>
          [`controlPaddingX.${size}`, density.controlPaddingX[size]] as const,
      ),
      ["rowHeight", density.rowHeight],
    ]),
    ...ladder(
      "density",
      controlSizes.map(
        (size) =>
          [`controlHeight.${size}`, density.controlHeight[size]] as const,
      ),
      "non-decreasing",
    ),
    ...ladder(
      "density",
      controlSizes.map(
        (size) =>
          [`controlPaddingX.${size}`, density.controlPaddingX[size]] as const,
      ),
      "non-decreasing",
    ),
    ...positive("density", "rowHeight", density.rowHeight),
    ...atLeast(
      "density",
      "controlHeight.sm",
      density.controlHeight.sm,
      typography.label.lineHeight + 2 * borderWidth.thin,
    ),
    ...atLeast(
      "density",
      "rowHeight",
      density.rowHeight,
      typography.body.lineHeight,
    ),
    ...atLeast(
      "density",
      "rowHeight",
      density.rowHeight,
      density.controlHeight.md,
    ),
    ...finiteMembers(
      "iconSize",
      (["xs", "sm", "md", "lg", "xl"] as const).map(
        (size) => [size, iconSize[size]] as const,
      ),
    ),
    ...ladder(
      "iconSize",
      (["xs", "sm", "md", "lg", "xl"] as const).map(
        (size) => [size, iconSize[size]] as const,
      ),
      "non-decreasing",
    ),
    ...atMost("iconSize", "md", iconSize.md, density.controlHeight.sm),
    ...finiteMembers(
      "avatarSize",
      (["xs", "sm", "md", "lg"] as const).map(
        (size) => [size, avatarSize[size]] as const,
      ),
    ),
    ...ladder(
      "avatarSize",
      (["xs", "sm", "md", "lg"] as const).map(
        (size) => [size, avatarSize[size]] as const,
      ),
      "non-decreasing",
    ),
    ...finiteMembers("radius", [
      ["none", radius.none],
      ["sm", radius.sm],
      ["md", radius.md],
      ["lg", radius.lg],
      ["xl", radius.xl],
      ["full", radius.full],
    ]),
    ...zero("radius", "none", radius.none),
    ...ladder(
      "radius",
      (["sm", "md", "lg", "xl"] as const).map(
        (step) => [step, radius[step]] as const,
      ),
      "non-decreasing",
    ),
    ...atLeast("radius", "full", radius.full, radius.xl),
    ...atLeast("radius", "full", radius.full, density.controlHeight.lg / 2),
    ...atLeast("radius", "full", radius.full, avatarSize.lg / 2),
    ...finiteMembers(
      "spacing",
      (
        [
          "2xs",
          "xs",
          "sm",
          "md",
          "lg",
          "xl",
          "2xl",
          "3xl",
          "4xl",
          "5xl",
        ] as const
      ).map((step) => [step, spacing[step]] as const),
    ),
    ...ladder(
      "spacing",
      (
        [
          "2xs",
          "xs",
          "sm",
          "md",
          "lg",
          "xl",
          "2xl",
          "3xl",
          "4xl",
          "5xl",
        ] as const
      ).map((step) => [step, spacing[step]] as const),
      "non-decreasing",
    ),
    ...finiteMembers("dimensions", [
      ["overlayMinWidth", dimensions.overlayMinWidth],
      ["overlayWidth", dimensions.overlayWidth],
      ["overlayMaxHeight", dimensions.overlayMaxHeight],
      ["fieldMinWidth", dimensions.fieldMinWidth],
      ["fieldAdornmentSize", dimensions.fieldAdornmentSize],
      ["chipMinWidth", dimensions.chipMinWidth],
      ["toastWidth", dimensions.toastWidth],
      ["previewCardMinWidth", dimensions.previewCardMinWidth],
      ["previewCardMaxWidth", dimensions.previewCardMaxWidth],
    ]),
    ...positive("dimensions", "overlayMinWidth", dimensions.overlayMinWidth),
    ...positive("dimensions", "overlayWidth", dimensions.overlayWidth),
    ...positive("dimensions", "overlayMaxHeight", dimensions.overlayMaxHeight),
    // The overlay scrolls a list of rows, so its maximum height must fit one
    // complete row; a viewport shorter than a row clips every option.
    ...atLeast(
      "dimensions",
      "overlayMaxHeight",
      dimensions.overlayMaxHeight,
      density.rowHeight,
    ),
    ...positive("dimensions", "fieldMinWidth", dimensions.fieldMinWidth),
    ...positive(
      "dimensions",
      "fieldAdornmentSize",
      dimensions.fieldAdornmentSize,
    ),
    ...positive("dimensions", "chipMinWidth", dimensions.chipMinWidth),
    ...positive("dimensions", "toastWidth", dimensions.toastWidth),
    ...positive(
      "dimensions",
      "previewCardMinWidth",
      dimensions.previewCardMinWidth,
    ),
    ...positive(
      "dimensions",
      "previewCardMaxWidth",
      dimensions.previewCardMaxWidth,
    ),
    ...ladder(
      "dimensions",
      [
        ["overlayMinWidth", dimensions.overlayMinWidth],
        ["overlayWidth", dimensions.overlayWidth],
      ],
      "increasing",
    ),
    ...ladder(
      "dimensions",
      [
        ["previewCardMinWidth", dimensions.previewCardMinWidth],
        ["previewCardMaxWidth", dimensions.previewCardMaxWidth],
      ],
      "increasing",
    ),
    ...atMost(
      "dimensions",
      "fieldAdornmentSize",
      dimensions.fieldAdornmentSize,
      density.controlHeight.sm,
    ),
    ...atMost(
      "dimensions",
      "chipMinWidth",
      dimensions.chipMinWidth,
      dimensions.fieldMinWidth,
    ),
    ...(["sm", "md", "lg", "overlay"] as const).flatMap((level) => {
      const shapes = elevation[level];
      if (shapes.length === 0) {
        return level === "overlay"
          ? []
          : [failure("elevation", level, "at-least", shapes.length, 1)];
      }
      return shapes.flatMap((shape, index) => [
        ...finite("elevation", `${level}[${index}].offsetX`, shape.offsetX),
        ...finite("elevation", `${level}[${index}].offsetY`, shape.offsetY),
        ...finite(
          "elevation",
          `${level}[${index}].blurRadius`,
          shape.blurRadius,
        ),
        ...nonNegative(
          "elevation",
          `${level}[${index}].blurRadius`,
          shape.blurRadius,
        ),
        ...finite(
          "elevation",
          `${level}[${index}].spreadRadius`,
          shape.spreadRadius,
        ),
        ...fraction("elevation", `${level}[${index}].alpha`, shape.alpha),
      ]);
    }),
    ...zero("motion", "none", motion.none),
    ...(["step", "fast", "normal", "slow", "pulse"] as const).flatMap((level) =>
      finite("motion", level, motion[level]),
    ),
    ...ladder(
      "motion",
      (["step", "fast", "normal", "slow", "pulse"] as const).map(
        (level) => [level, motion[level]] as const,
      ),
      "non-decreasing",
    ),
    ...(["standard", "enter", "exit", "linear"] as const).flatMap((phase) =>
      easing("motion", phase, motion.ease[phase]),
    ),
  ];
}
