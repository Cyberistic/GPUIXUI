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

import {
  elevationLevels,
  lightElevation,
  type Elevation,
} from "./elevation.js";
import { motionLevels, motionPhases, type MotionEasing } from "./motion.js";
import {
  avatarSize,
  borderWidth,
  controlSizes,
  dimensions,
  iconSize,
  radius,
  spacing,
} from "./scale.js";
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

/**
 * The rules a metric can miss, in documentation order. `MetricRule` derives
 * from this list, so a new rule must also gain a value here and a line in the
 * rule reference; a diagnostics table iterates it instead of retyping the
 * names.
 */
export const metricRules = [
  "positive",
  "non-negative",
  "zero",
  "finite",
  "increasing",
  "non-decreasing",
  "at-least",
  "at-most",
  "within",
] as const;

/** The rule a metric missed. */
export type MetricRule = (typeof metricRules)[number];

/** The numeric fields of one elevation shape, taken from the shipped level. */
const shadowFields = Object.keys(lightElevation.sm[0] ?? {});

/** The fields of a type role that carry a number. */
const typeFields = ["fontSize", "lineHeight", "fontWeight"] as const;

/** The four control points of a cubic-bezier easing. */
const easingPoints = [0, 1, 2, 3] as const;

/**
 * Every numeric member of the shipped themes, one ordered list per group — the
 * numeric sibling of `colorRoles`, so a diagnostics table or a reference row
 * iterates the domain instead of retyping it. A theme may carry a wider scale
 * than the shipped one; the ladders walk the theme's own members, so this index
 * names the shipped domain, not the limit of what is governed.
 *
 * Each list derives from the group's own default object or its ordered index
 * (`dimensions`, `controlSizes`, `elevationLevels`, `motionLevels`,
 * `motionPhases`), so a member added to the interface and its default ships in
 * the index. An elevation entry names the shape's field without the array index
 * (`md.offsetX`): the rule reads every entry in a level, while a failure names
 * the one it measured (`md[0].offsetX`). The easing points are listed even
 * though the shipped easings are named strings, because a theme may replace a
 * phase with a tuple.
 */
export const metricMembers = {
  typography: textRoles.flatMap((role) =>
    typeFields.map((field) => `${role}.${field}`),
  ),
  borderWidth: Object.keys(borderWidth),
  density: [
    ...controlSizes.map((size) => `controlHeight.${size}`),
    ...controlSizes.map((size) => `controlPaddingX.${size}`),
    "rowHeight",
  ],
  dimensions: Object.keys(dimensions),
  iconSize: Object.keys(iconSize),
  avatarSize: Object.keys(avatarSize),
  radius: Object.keys(radius),
  spacing: Object.keys(spacing),
  elevation: elevationLevels.flatMap((level) =>
    shadowFields.map((field) => `${level}.${field}`),
  ),
  motion: [
    ...motionLevels,
    ...motionPhases.flatMap((phase) =>
      easingPoints.map((point) => `ease.${phase}[${point}]`),
    ),
  ],
} satisfies Record<MetricGroup, ReadonlyArray<string>>;

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

/**
 * Sign rules describe a value that is a number: a size at or below zero paints
 * nothing, and a negative step points the wrong way. A `NaN` is the finite
 * rule's diagnostic, so these comparisons are written to stay silent for it.
 */
const positive = (
  group: MetricGroup,
  member: string,
  actual: number,
): ReadonlyArray<MetricFailure> =>
  actual <= 0 ? [failure(group, member, "positive", actual, 0)] : [];

const nonNegative = (
  group: MetricGroup,
  member: string,
  actual: number,
): ReadonlyArray<MetricFailure> =>
  actual < 0 ? [failure(group, member, "non-negative", actual, 0)] : [];

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

/**
 * The two bounds. A value the finite rule already rejects is not compared: one
 * bad number would otherwise blame the finite value on the other side of the
 * comparison, so the cause keeps one diagnostic.
 */
const atLeast = (
  group: MetricGroup,
  member: string,
  actual: number,
  bound: number,
): ReadonlyArray<MetricFailure> =>
  Number.isFinite(actual) && Number.isFinite(bound) && actual < bound
    ? [failure(group, member, "at-least", actual, bound)]
    : [];

const atMost = (
  group: MetricGroup,
  member: string,
  actual: number,
  bound: number,
): ReadonlyArray<MetricFailure> =>
  Number.isFinite(actual) && Number.isFinite(bound) && actual > bound
    ? [failure(group, member, "at-most", actual, bound)]
    : [];

/**
 * An elevation alpha is a fraction. Finiteness is the walk's job, so this rule
 * only reports a finite value outside `0…1`; `alpha()` clamps such a value, but
 * a fraction the theme did not design is still a broken level.
 */
const fraction = (
  group: MetricGroup,
  member: string,
  actual: number,
): ReadonlyArray<MetricFailure> =>
  Number.isFinite(actual) && (actual < 0 || actual > 1)
    ? [failure(group, member, "within", actual, 1)]
    : [];

/**
 * A cubic-bezier easing the renderer can interpolate. Finiteness is the walk's
 * job; the runtime's `validate_ease` additionally rejects an x value outside
 * `0…1`, and a curve outside that range has no progress function. A y value may
 * overshoot — a spring-like curve is a design choice, not breakage. A named
 * easing is constrained by `MotionEasing` itself.
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
        ...fraction(group, `ease.${phase}[2]`, value[2]),
      ];

/**
 * A font weight is a number in the CSS weight range. Finiteness is the walk's
 * job, so this rule only reports a finite value the range cannot select: the
 * runtime chooses the nearest weight the family provides, and a weight outside
 * `1…1000` names none.
 */
const weighable = (
  member: string,
  actual: number,
): ReadonlyArray<MetricFailure> =>
  Number.isFinite(actual)
    ? [
        ...atLeast("typography", member, actual, 1),
        ...atMost("typography", member, actual, 1000),
      ]
    : [];

/**
 * A ladder of named steps. Every step must be a non-negative number and, from
 * the second on, step past the one before it — or reach it, for a
 * `non-decreasing` ladder, because several shipped styles share a step (Linux
 * and Windows ship `radius.lg === radius.xl`; Windows ships
 * `motion.fast === motion.step`). A step the finite rule rejects is not compared,
 * so one bad value keeps one diagnostic instead of blaming its neighbour.
 */
const ladder = (
  group: MetricGroup,
  steps: ReadonlyArray<readonly [string, number]>,
  rule: "increasing" | "non-decreasing",
  /**
   * The rule every step is held to. A spacing step or a radius may be zero — a
   * borderless or square theme is a design — while a named icon or avatar size
   * and a control's horizontal padding are sizes that must paint, so those
   * ladders ask for `positive`.
   */
  stepRule: "non-negative" | "positive" = "non-negative",
): ReadonlyArray<MetricFailure> =>
  steps.flatMap(([member, value], index) => {
    const previous = steps[index - 1];
    const sign =
      stepRule === "positive"
        ? positive(group, member, value)
        : nonNegative(group, member, value);
    if (
      previous === undefined ||
      !Number.isFinite(value) ||
      !Number.isFinite(previous[1])
    ) {
      return sign;
    }
    const ok =
      rule === "increasing" ? value > previous[1] : value >= previous[1];
    return [
      ...sign,
      ...(ok ? [] : [failure(group, member, rule, value, previous[1])]),
    ];
  });

/**
 * Every numeric leaf of a group value, addressed the way a failure names it.
 * The walk is what makes the contract total: a member added to a group is
 * finite-checked when it ships, without a list to update. Strings — the density
 * preset name, a named easing — and other non-numbers are not metrics.
 */
const numericMembers = (
  value: unknown,
  prefix: string,
): ReadonlyArray<readonly [string, number]> => {
  if (typeof value === "number") {
    return [[prefix, value]];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      numericMembers(entry, `${prefix}[${index}]`),
    );
  }
  if (typeof value === "object" && value !== null) {
    return Object.entries(value).flatMap(([key, entry]) =>
      numericMembers(entry, prefix === "" ? key : `${prefix}.${key}`),
    );
  }
  return [];
};

/** Every numeric member of a group, held to the `finite` rule. */
const finiteGroup = (
  group: MetricGroup,
  value: unknown,
): ReadonlyArray<MetricFailure> =>
  numericMembers(value, "").flatMap(([member, actual]) =>
    finite(group, member, actual),
  );

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
 * The steps of a scale in the order the theme holds them. `extendTheme` copies
 * the base group and assigns the override, so a shipped scale keeps its authored
 * order and a step a theme adds lands after the last one it knows. Walking the
 * theme's object — instead of the shipped names — is what makes the ladder rules
 * total: a brand may carry a wider scale than the identity, and the same walker
 * the finite pass uses reads it.
 */
const scaleSteps = (scale: unknown): ReadonlyArray<readonly [string, number]> =>
  numericMembers(scale, "");

/** A density size ladder, named the way a failure reports it. */
const sizeSteps = (
  group: "controlHeight" | "controlPaddingX",
  sizes: unknown,
): ReadonlyArray<readonly [string, number]> =>
  scaleSteps(sizes).map(
    ([size, value]) => [`${group}.${size}`, value] as const,
  );

/**
 * The elevation feather is the level's height. A level's first entry is the
 * shadow the native runtime paints, so `sm` → `md` → `lg` may not get a smaller
 * blur as it rises. Opacity is deliberately not a step: a fainter dialog shadow
 * or a flat theme is a design, while a dialog that feathers less than a resting
 * card makes "lg" a shallower level than "sm". A feather the range rules already
 * reject — non-finite or negative — is not compared, so one bad level keeps one
 * diagnostic instead of cascading into its neighbour.
 */
const featherLadder = (elevation: Elevation): ReadonlyArray<MetricFailure> => {
  const steps = (["sm", "md", "lg"] as const).flatMap((level) => {
    const [shape] = elevation[level];
    return shape === undefined ? [] : [[level, shape.blurRadius] as const];
  });
  return steps.flatMap(([level, blur], index) => {
    const previous = steps[index - 1];
    if (
      previous === undefined ||
      !Number.isFinite(blur) ||
      !Number.isFinite(previous[1]) ||
      blur < 0 ||
      previous[1] < 0
    ) {
      return [];
    }
    return blur >= previous[1]
      ? []
      : [
          failure(
            "elevation",
            `${level}[0].blurRadius`,
            "non-decreasing",
            blur,
            previous[1],
          ),
        ];
  });
};

/**
 * Every numeric rule a theme misses.
 *
 * The six size ladders — density's two, `spacing`, `radius`, `iconSize` and
 * `avatarSize` — are read from the theme's own scale object, in the order the
 * theme holds its steps, so a step a brand adds is compared too; `radius.none`
 * and `radius.full` stay on their own rules below.
 *
 * - **typography**: a role needs a size, leading and weight, and a line box
 *   shorter than its type clips the glyphs; a weight is a CSS number in `1…1000`
 *   the renderer can select. The two documented size ladders — prose
 *   {@link proseLadder} and code {@link codeLadder} — may not be inverted, and
 *   `bodyStrong` is the weight variant of `body`: it may not shrink below it and
 *   must stay heavier, or emphasis is indistinguishable from body text.
 * - **borderWidth**: `strong` is the focus ring's spread, and the ring is the
 *   only focus indicator the runtime can draw, so it may not be zero and may
 *   not be thinner than `thin` — a ring below a decorative border has inverted
 *   the two roles and can round away. Every other width, including one a theme
 *   adds, is read from the theme's own group and may not be negative; `thin`
 *   may be zero in a borderless theme, so it is only non-negative.
 * - **density**: sizes and padding are ladders, a control's horizontal padding
 *   stays positive and is no tighter than the theme's own hairline
 *   (`spacing["2xs"]`), because it is the inset between the label and the
 *   border painted inside the same box, the smallest control fits one label line
 *   and one body line — a field paints body type — plus the default icon and a
 *   field adornment, each plus its two borders, and a row fits one body line and
 *   the default `md` control it holds.
 * - **dimensions**: every surface metric — the shipped members and one a theme
 *   adds, read from the theme's own group — is positive, each documented range
 *   has a minimum below its default, a chip fits in the field's content box — its
 *   minimum width less the field's two borders and horizontal padding — the
 *   overlay scroll height fits one row, because a list viewport shorter than a
 *   row clips every option, the message viewport fits one row for the same
 *   reason, a keycap's content box holds one caption line plus its two borders,
 *   because `Keycap` paints caption text inside it, the drawer widths and
 *   heights each grow from `sm` to `lg`, and a carousel's active mark is at
 *   least as wide as its idle dot.
 * - **iconSize**, **avatarSize**: named ladders of positive sizes — a zero size
 *   paints no icon or identity mark; the default icon fits the smallest control,
 *   and an inline icon fits the line box it shares with text (`xs` a `caption`
 *   line, `sm` a `label` line), because a taller glyph raises that line. The
 *   inline avatar tier (`xs`) fits a dense row (`density.rowHeight`), because a
 *   `ListItem` fixes that row's height and documents its leading slot for an
 *   avatar.
 * - **radius**: `none` is square, the four steps are a ladder, and `full` rounds
 *   the largest radius, half the largest control and half the largest avatar —
 *   a 40px avatar at a smaller radius is a rounded square.
 * - **spacing**: a ladder.
 * - **elevation**: `sm`/`md`/`lg` each hold a shadow whose two offsets, blur and
 *   spread are finite, whose blur is non-negative, and whose alpha is a
 *   fraction, and each level's painted feather (`blurRadius`) is no smaller than
 *   the level below it — a dialog that feathers less than a resting card makes
 *   "lg" a shallower level than "sm". Opacity is not a step: a fainter large
 *   level and a flat theme are designs. `overlay` ships reserved and empty, and
 *   an empty level is exempt; a level a consumer defines — `overlay` included —
 *   is held to the same rules, because `elevationShadow` will paint it.
 * - **motion**: `none` is zero, the timings are a finite non-decreasing ladder,
 *   and a cubic-bezier easing holds four finite control points with both x
 *   values inside `0…1` — the runtime rejects the whole transition otherwise. A
 *   y value may overshoot; an easing named by `MotionEasing` is constrained by
 *   the type.
 *
 * The level is not a parameter: these rules are the same at every contrast
 * setting, because they describe shapes, not colour. Every numeric member of
 * every group is also **finite**, and that half is walked from the group value
 * instead of a hand-written list: a member added to a group is governed the
 * moment it ships, because the renderer casts each one to a 32-bit float and an
 * infinity becomes invalid layout it paints as nothing, silently. A non-finite
 * value is reported as `finite`; a finite value outside its range is `within`.
 * {@link metricMembers} is the published index of the walked domain.
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
    ...finiteGroup("typography", typography),
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
    ...textRoles.flatMap((role) =>
      weighable(`${role}.fontWeight`, typography[role].fontWeight),
    ),
    ...finiteGroup("borderWidth", borderWidth),
    // A width is a stroke: zero is a deliberate borderless design, but a
    // negative one paints nothing. `strong` keeps the stricter `positive` rule
    // below, so it is filtered here to keep one value to one diagnostic.
    ...scaleSteps(borderWidth)
      .filter(([member]) => member !== "strong")
      .flatMap(([member, value]) => nonNegative("borderWidth", member, value)),
    ...positive("borderWidth", "strong", borderWidth.strong),
    // `strong` is the emphasis border and the spread of the only focus
    // indicator the runtime paints, so it may equal the default border but
    // never be thinner than it. A value at or below zero is already the
    // `positive` rule's diagnostic, so the order is not compared twice.
    ...(borderWidth.strong <= 0
      ? []
      : atLeast("borderWidth", "strong", borderWidth.strong, borderWidth.thin)),
    ...finiteGroup("density", density),
    ...ladder(
      "density",
      sizeSteps("controlHeight", density.controlHeight),
      "non-decreasing",
    ),
    ...ladder(
      "density",
      sizeSteps("controlPaddingX", density.controlPaddingX),
      "non-decreasing",
      "positive",
    ),
    // A control paints its label `controlPaddingX` inside its own border, and
    // the spacing scale is shared by padding, so an inset tighter than the
    // theme's own hairline puts the glyph on the edge.
    ...controlSizes.flatMap((size) =>
      atLeast(
        "density",
        `controlPaddingX.${size}`,
        density.controlPaddingX[size],
        spacing["2xs"],
      ),
    ),
    ...positive("density", "rowHeight", density.rowHeight),
    // A control is not always a label: a field paints the body role, so the
    // smallest box has to fit the taller of the two line boxes. Both are
    // painted inside the two borders.
    ...atLeast(
      "density",
      "controlHeight.sm",
      density.controlHeight.sm,
      Math.max(typography.label.lineHeight, typography.body.lineHeight) +
        2 * borderWidth.thin,
    ),
    // A control paints its two borders inside its height, so a glyph or a
    // field adornment equal to the height overflows the content box.
    ...atLeast(
      "density",
      "controlHeight.sm",
      density.controlHeight.sm,
      iconSize.md + 2 * borderWidth.thin,
    ),
    ...atLeast(
      "density",
      "controlHeight.sm",
      density.controlHeight.sm,
      dimensions.fieldAdornmentSize + 2 * borderWidth.thin,
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
    ...finiteGroup("iconSize", iconSize),
    ...ladder("iconSize", scaleSteps(iconSize), "non-decreasing", "positive"),
    // An inline icon is painted inside the line box of the text it sits with
    // (`scale.ts`: `xs` is inline with a caption, `sm` with a label). A glyph
    // taller than the line raises the row it is centred in, so the two inline
    // sizes are bounded by the theme's own leading — not by a house literal.
    ...atMost("iconSize", "xs", iconSize.xs, typography.caption.lineHeight),
    ...atMost("iconSize", "sm", iconSize.sm, typography.label.lineHeight),
    ...finiteGroup("avatarSize", avatarSize),
    ...ladder(
      "avatarSize",
      scaleSteps(avatarSize),
      "non-decreasing",
      "positive",
    ),
    // The `xs` tier is the inline avatar (`scale.ts`): a dense `ListItem` fixes
    // its height at `density.rowHeight` and documents its leading slot for an
    // avatar, so a mark taller than the row cannot fit the row it leads.
    ...atMost("avatarSize", "xs", avatarSize.xs, density.rowHeight),
    ...finiteGroup("radius", radius),
    ...zero("radius", "none", radius.none),
    ...ladder(
      "radius",
      scaleSteps(radius).filter(([step]) => step !== "none" && step !== "full"),
      "non-decreasing",
    ),
    ...atLeast("radius", "full", radius.full, radius.xl),
    ...atLeast("radius", "full", radius.full, density.controlHeight.lg / 2),
    ...atLeast("radius", "full", radius.full, avatarSize.lg / 2),
    ...finiteGroup("spacing", spacing),
    ...ladder("spacing", scaleSteps(spacing), "non-decreasing"),
    ...finiteGroup("dimensions", dimensions),
    // Every surface metric is a pixel size a component paints inside a fixed
    // box, so a theme that adds one is held to the same rule as the shipped
    // members. `extendTheme` copies the group, so the walk sees the arrived
    // member in the order the theme holds it.
    ...scaleSteps(dimensions).flatMap(([member, value]) =>
      positive("dimensions", member, value),
    ),
    // The overlay scrolls a list of rows, so its maximum height must fit one
    // complete row; a viewport shorter than a row clips every option.
    ...atLeast(
      "dimensions",
      "overlayMaxHeight",
      dimensions.overlayMaxHeight,
      density.rowHeight,
    ),
    // A keycap paints the caption role inside a fixed surface: its two borders
    // are inside `keycapSize`, so a caption leading that grows past the content
    // box clips the shortcut label.
    ...atLeast(
      "dimensions",
      "keycapSize",
      dimensions.keycapSize,
      typography.caption.lineHeight + 2 * borderWidth.thin,
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
    ...ladder(
      "dimensions",
      [
        ["drawerWidthSm", dimensions.drawerWidthSm],
        ["drawerWidthMd", dimensions.drawerWidthMd],
        ["drawerWidthLg", dimensions.drawerWidthLg],
      ],
      "increasing",
    ),
    ...ladder(
      "dimensions",
      [
        ["drawerHeightSm", dimensions.drawerHeightSm],
        ["drawerHeightMd", dimensions.drawerHeightMd],
        ["drawerHeightLg", dimensions.drawerHeightLg],
      ],
      "increasing",
    ),
    // The chip sits inside the field's content box: the field's two borders
    // and its horizontal control padding are inside `fieldMinWidth`.
    ...atLeast(
      "dimensions",
      "fieldMinWidth",
      dimensions.fieldMinWidth,
      dimensions.chipMinWidth +
        2 * density.controlPaddingX.md +
        2 * borderWidth.thin,
    ),
    // A message viewport shorter than one row clips every message it holds.
    ...atLeast(
      "dimensions",
      "chatViewportMinHeight",
      dimensions.chatViewportMinHeight,
      density.rowHeight,
    ),
    // The active carousel mark may elongate; it may not shrink below the idle
    // dot it replaces.
    ...atLeast(
      "dimensions",
      "carouselIndicatorActiveWidth",
      dimensions.carouselIndicatorActiveWidth,
      dimensions.carouselIndicatorSize,
    ),
    ...finiteGroup("elevation", elevation),
    ...elevationLevels.flatMap((level) => {
      const shapes = elevation[level];
      if (shapes.length === 0) {
        return level === "overlay"
          ? []
          : [failure("elevation", level, "at-least", shapes.length, 1)];
      }
      return shapes.flatMap((shape, index) => [
        ...nonNegative(
          "elevation",
          `${level}[${index}].blurRadius`,
          shape.blurRadius,
        ),
        ...fraction("elevation", `${level}[${index}].alpha`, shape.alpha),
      ]);
    }),
    ...featherLadder(elevation),
    ...finiteGroup("motion", motion),
    ...zero("motion", "none", motion.none),
    ...ladder(
      "motion",
      motionLevels
        .filter((level) => level !== "none")
        .map((level) => [level, motion[level]] as const),
      "non-decreasing",
    ),
    ...motionPhases.flatMap((phase) =>
      easing("motion", phase, motion.ease[phase]),
    ),
  ];
}
