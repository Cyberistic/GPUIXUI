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
  elevationShapeFields,
  type Elevation,
} from "./elevation.js";
import { motionLevels, motionPhases, type MotionEasing } from "./motion.js";
import {
  avatarSizeSteps,
  borderWidthSteps,
  controlSizes,
  dimensionNames,
  dimensions,
  iconSizeSteps,
  radiusSteps,
  spacingSteps,
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

/** The numeric fields of one elevation shape, from the interface's one index. */
const shadowFields = elevationShapeFields;

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
 * Each list derives from the group's ordered index (`dimensionNames`,
 * `spacingSteps`, `radiusSteps`, `borderWidthSteps`, `iconSizeSteps`,
 * `avatarSizeSteps`, `controlSizes`, `elevationLevels`, `motionLevels`,
 * `motionPhases`), so the shipped domain has one owner and a member added to a
 * scale must also join its index — `scale-indexes.test.ts` fails until it does.
 * An elevation entry names the shape's field without the array index
 * (`md.offsetX`): the rule reads every entry in a level, while a failure names
 * the one it measured (`md[0].offsetX`). The easing points are listed even
 * though the shipped easings are named strings, because a theme may replace a
 * phase with a tuple.
 */
export const metricMembers = {
  typography: textRoles.flatMap((role) =>
    typeFields.map((field) => `${role}.${field}`),
  ),
  borderWidth: borderWidthSteps,
  density: [
    ...controlSizes.map((size) => `controlHeight.${size}`),
    ...controlSizes.map((size) => `controlPaddingX.${size}`),
    "rowHeight",
  ],
  dimensions: dimensionNames,
  iconSize: iconSizeSteps,
  avatarSize: avatarSizeSteps,
  radius: radiusSteps,
  spacing: spacingSteps,
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
 * The renderer's own number. GPUix receives a metric as a JavaScript `f64` and
 * casts it to the `f32` GPUI lays out with (`renderer.rs`: `px(value as f32)`),
 * so a value beyond `f32`'s range becomes an infinity Taffy rejects and a
 * positive value below its smallest subnormal becomes zero. `Math.fround` is
 * that cast, so this is the predicate the contract means by "paintable".
 */
const paints = (value: number): boolean => Number.isFinite(Math.fround(value));

/**
 * Sign rules describe a value the renderer can paint: a size that paints at or
 * below zero has no shape, and a negative step points the wrong way. The
 * comparison reads the cast, so a positive size that rounds to zero is still a
 * size that paints nothing. A `NaN` or an infinity is the finite rule's
 * diagnostic, so these comparisons are written to stay silent for it.
 */
const positive = (
  group: MetricGroup,
  member: string,
  actual: number,
): ReadonlyArray<MetricFailure> =>
  Math.fround(actual) <= 0
    ? [failure(group, member, "positive", actual, 0)]
    : [];

const nonNegative = (
  group: MetricGroup,
  member: string,
  actual: number,
): ReadonlyArray<MetricFailure> =>
  Math.fround(actual) < 0
    ? [failure(group, member, "non-negative", actual, 0)]
    : [];

const zero = (
  group: MetricGroup,
  member: string,
  actual: number,
): ReadonlyArray<MetricFailure> =>
  actual === 0 ? [] : [failure(group, member, "zero", actual, 0)];

/**
 * A value the renderer can paint. `NaN` and the infinities are numbers no
 * `StyleDesc` accepts, and neither is a finite `f64` beyond `f32`'s range:
 * `px(value as f32)` turns it into an infinity, the same silent loss as a zero
 * focus-ring spread, one metric group over. A negative offset or spread is a
 * direction and stays valid; only paintability is checked.
 */
const finite = (
  group: MetricGroup,
  member: string,
  actual: number,
): ReadonlyArray<MetricFailure> =>
  paints(actual) ? [] : [failure(group, member, "finite", actual, 0)];

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
  paints(actual) && paints(bound) && actual < bound
    ? [failure(group, member, "at-least", actual, bound)]
    : [];

const atMost = (
  group: MetricGroup,
  member: string,
  actual: number,
  bound: number,
): ReadonlyArray<MetricFailure> =>
  paints(actual) && paints(bound) && actual > bound
    ? [failure(group, member, "at-most", actual, bound)]
    : [];

/**
 * Whether a dependent fit rule has a bound worth comparing. A zero, negative or
 * unpaintable bound is already its own rule's diagnostic — a zero
 * `avatarSize.xs`, `controlHeight.sm` or `body.fontSize`, or a line that
 * overflows the renderer's `f32` cast — so comparing against it would report one
 * cause twice, blaming the metric that fits inside it. The same guard applies to
 * a fit whose bound is a line or a row: an inline icon above a caption or label
 * line, and an inline avatar above a dense row, are reported only when the line
 * or row is itself a usable size.
 */
const usableBound = (bound: number): boolean =>
  paints(bound) && Math.fround(bound) > 0;

/**
 * A tabular digit advances at most 0.65em in the UI families the platform
 * styles name; a two-digit time segment is 1.3em. The bound rounds up because a
 * segment is painted at a whole pixel, and a theme that names a wider face must
 * widen its segment.
 */
const digitAdvanceEm = 0.65;

/**
 * An elevation alpha is a fraction. Paintability is the walk's job, so this
 * rule only reports a paintable value outside `0…1`; `alpha()` clamps such a
 * value, but a fraction the theme did not design is still a broken level.
 */
const fraction = (
  group: MetricGroup,
  member: string,
  actual: number,
): ReadonlyArray<MetricFailure> =>
  paints(actual) && (actual < 0 || actual > 1)
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
 * A font weight is a number in the CSS weight range. Paintability is the walk's
 * job, so this rule only reports a paintable value the range cannot select: the
 * runtime chooses the nearest weight the family provides, and a weight outside
 * `1…1000` names none.
 */
const weighable = (
  member: string,
  actual: number,
): ReadonlyArray<MetricFailure> =>
  paints(actual)
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
    if (previous === undefined || !paints(value) || !paints(previous[1])) {
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

/**
 * The smallest or largest finite value a named scale the theme carries. A rule
 * that says "the largest avatar" or "the smallest avatar" means the theme's own
 * extreme, not the shipped member's name: `extendTheme` keeps a widened scale,
 * and the ladders walk it. A non-finite member is the finite rule's diagnostic,
 * so it is not compared here.
 */
const extremeSize = (
  scale: unknown,
  kind: "smallest" | "largest",
  excluded: ReadonlyArray<string> = [],
): number | undefined =>
  scaleSteps(scale)
    .flatMap(([member, value]) =>
      excluded.includes(member) || !paints(value) ? [] : [value],
    )
    .reduce<number | undefined>(
      (extreme, value) =>
        extreme === undefined
          ? value
          : kind === "smallest"
            ? Math.min(extreme, value)
            : Math.max(extreme, value),
      undefined,
    );

/**
 * Whether a named scale is ordered as its ladder rule requires. A shape bound
 * derived from a broken scale would blame `full` or the presence dot for the
 * scale's own defect, so an unordered scale yields no extreme (the ladder
 * failure is the diagnostic).
 */
const orderedScale = (
  scale: unknown,
  excluded: ReadonlyArray<string> = [],
): boolean => {
  const steps = scaleSteps(scale).filter(
    ([member]) => !excluded.includes(member),
  );
  return steps.every(([, value], index) => {
    const previous = steps[index - 1];
    return (
      previous === undefined ||
      !paints(value) ||
      !paints(previous[1]) ||
      value >= previous[1]
    );
  });
};

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
 * shadow the native runtime paints, so every **defined** level, in
 * `elevationLevels` order — `sm` → `md` → `lg`, and a defined `overlay` above
 * them — may not get a smaller blur as it rises. Opacity is deliberately not a
 * step: a fainter dialog shadow or a flat theme is a design, while a dialog that
 * feathers less than a resting card makes "lg" a shallower level than "sm". A
 * feather the range rules already reject — non-finite or negative — is not
 * compared, so one bad level keeps one diagnostic instead of cascading into its
 * neighbour.
 */
const featherLadder = (elevation: Elevation): ReadonlyArray<MetricFailure> => {
  const steps = elevationLevels.flatMap((level) => {
    const [shape] = elevation[level];
    return shape === undefined ? [] : [[level, shape.blurRadius] as const];
  });
  return steps.flatMap(([level, blur], index) => {
    const previous = steps[index - 1];
    if (
      previous === undefined ||
      !paints(blur) ||
      !paints(previous[1]) ||
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
 * The fixed marks a theme owns, beside the timeline marker that already reads
 * the rail it marks: the Toast's tone bar, the inbox's unread dot, a carousel
 * indicator and an avatar's presence dot. A mark below the theme's own hairline
 * is thinner than the smallest stroke a border may paint; the carousel's active
 * mark and the timeline marker have their own bounds.
 */
const fixedMarks = [
  "toastToneBarWidth",
  "notificationUnreadDotSize",
  "carouselIndicatorSize",
  "avatarPresenceDotSize",
] as const satisfies ReadonlyArray<keyof typeof dimensions>;

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
 *   minimum width less the field's two borders and horizontal padding — and the
 *   same minimum holds the query row the token documents: the field's
 *   `spacing.md` padding, a leading `md` icon, the gap, one
 *   `body` query glyph, the same gap, the trailing `fieldAdornmentSize` action
 *   and the field's two borders; the chip's own minimum is the outer width the
 *   component paints (`minWidth`), so it holds its two `spacing.sm` insets, one
 *   `caption` glyph, the `spacing.xs` gap and the `fieldAdornmentSize` remove
 *   control, while the field bound is the other half of the same composition; a date
 *   trigger holds its own insets, its gap, one `label` glyph and the `sm`
 *   disclosure icon it paints, the overlay scroll height fits one row, because a list
 *   viewport shorter than a row clips every option, the message viewport holds
 *   one row inside its own `spacing.md` padding and two borders, and the preview
 *   card leaves a content box inside its `spacing.lg` padding and two borders.
 *   A keycap's content box holds one caption line plus its two borders,
 *   because `Keycap` paints caption text inside it, a field's adornment holds
 *   one `caption` line, the glyph its clear control paints, the drawer widths and
 *   heights each grow from `sm` to `lg`, a carousel's active mark is at least as
 *   wide as its idle dot, the dialog widths grow from `sm` to `lg`, a dialog's
 *   and a drawer's smallest shell holds the surface's `spacing["2xl"]` inset on
 *   the left, the greater of the shell's two `spacing["2xl"]` right insets and
 *   the close control's reach (`spacing.lg + controlHeight.sm`) on the right,
 *   and one `h3` title glyph, and a bottom drawer's
 *   smallest height holds the close zone, one row and its bottom padding, every
 *   one of those surfaces holding its chrome inside its own two
 *   `borderWidth.thin` edges — the shipped widths need 90 and the height 98 —
 *   a calendar
 *   day cell fits the smallest control, a time segment holds two body digits
 *   (`HH`/`MM`), at a 0.65em tabular advance rounded up to a pixel, and an
 *   avatar's presence dot is at most half the smallest avatar the theme carries.
 *   A fixed mark — the Toast's tone bar, the inbox's unread dot, a carousel
 *   indicator or an avatar's presence dot — is at least the theme's own hairline
 *   (`borderWidth.thin`), because a mark thinner than the smallest stroke a
 *   border may paint does not read; the timeline marker already reads the rail
 *   it marks. The menu's minimum width, the Toast card and the notification inbox follow
 *   the same content-box rule: the menu charges the surface's `spacing.xs`
 *   padding beside its row, the Toast card holds its row chrome plus its own two
 *   borders and counts its `toastToneBarWidth` tone bar and the
 *   square `sm` dismiss control it always paints after one `spacing.lg` gap
 *   because the title column flexes and the control does not, and the inbox's
 *   maximum height contains the header above
 *   its list — two `spacing.lg` insets, one `sm` action and the header's own rule
 *   — plus the list and those two borders, because a panel capped at the list
 *   alone squeezes the header the inbox always paints.
 * - **iconSize**, **avatarSize**: named ladders of positive sizes — a zero size
 *   paints no icon or identity mark; the default icon fits the smallest control,
 *   and an inline icon fits the line box it shares with text (`xs` a `caption`
 *   line, `sm` a `label` line), because a taller glyph raises that line. The
 *   inline avatar tier (`xs`) fits a dense row (`density.rowHeight`), because a
 *   `ListItem` fixes that row's height and documents its leading slot for an
 *   avatar.
 * - **radius**: `none` is square, the four steps are a ladder, and `full` rounds
 *   the largest corner step the theme carries, half the largest control and half
 *   the largest avatar — each read from the theme's own scale, so a brand that
 *   adds a step moves the bound, and a 40px avatar at a smaller radius is a
 *   rounded square.
 * - **spacing**: a ladder.
 * - **elevation**: `sm`/`md`/`lg` each hold a shadow whose two offsets, blur and
 *   spread are finite, whose blur is non-negative, and whose alpha is a
 *   fraction, and each **defined** level's painted feather (`blurRadius`) is no
 *   smaller than the defined level below it, in `elevationLevels` order — a
 *   defined `overlay` joins the ladder above `lg` — because the level names are
 *   an order: a dialog that feathers less than a resting card makes "lg" a
 *   shallower level than "sm". A level holds **at most one** shape: the native
 *   runtime paints one shadow per element and `elevationShadow` reads the first
 *   entry, so a second shape is geometry the theme declared and the runtime
 *   never paints. A copied web multi-shadow level is therefore reported by the
 *   native contract instead of silently returning `[]`; `elevationShadows`
 *   still resolves the list. Opacity is not a step: a fainter large level and
 *   a flat theme are designs. `overlay` ships reserved and empty, and an empty
 *   level is exempt; a level a consumer defines — `overlay` included — is held
 *   to the same rules, because `elevationShadow` will paint it.
 * - **motion**: `none` is zero, the timings are a finite non-decreasing ladder,
 *   and a cubic-bezier easing holds four finite control points with both x
 *   values inside `0…1` — the runtime rejects the whole transition otherwise. A
 *   y value may overshoot; an easing named by `MotionEasing` is constrained by
 *   the type.
 *
 * The level is not a parameter: these rules are the same at every contrast
 * setting, because they describe shapes, not colour. Every numeric member of
 * every group is also **paintable**, and that half is walked from the group
 * value instead of a hand-written list: the renderer casts each one to a 32-bit
 * float and a value that overflows that cast becomes an infinity it paints as
 * nothing, silently, so `finite` means finite **after** the cast and `1e39` is
 * reported. A positive size that rounds to zero in the same cast is the
 * `positive` rule's diagnostic. A member added to a group is governed the
 * moment it ships. A non-finite value is reported as `finite`; a finite value
 * outside its range is `within`. {@link metricMembers} is the published index
 * of the walked domain.
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
  // A dialog's or drawer's close control is a square `controlHeight.sm` at
  // `spacing.lg` from the inner right edge. The title keeps clear of the closer
  // of that control and the shell's right inset plus the header's reserve
  // (`2 * spacing["2xl"]`), so the shell reserves the larger
  // (`dialog.tsx`, `drawer.tsx`).
  const shellCloseReserve = Math.max(
    2 * spacing["2xl"],
    spacing.lg + density.controlHeight.sm,
  );
  // The shape bounds name an extreme, not a shipped member: a copied scale may
  // carry a larger corner, control or avatar, or a smaller avatar, and the
  // ladder rules already govern that member. A broken scale yields no bound, so
  // its ladder failure stays the one diagnostic.
  const largestCorner = orderedScale(radius, ["none", "full"])
    ? extremeSize(radius, "largest", ["none", "full"])
    : undefined;
  const largestControl = orderedScale(density.controlHeight)
    ? extremeSize(density.controlHeight, "largest")
    : undefined;
  const largestAvatar = orderedScale(avatarSize)
    ? extremeSize(avatarSize, "largest")
    : undefined;
  const smallestAvatar = orderedScale(avatarSize)
    ? extremeSize(avatarSize, "smallest")
    : undefined;
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
    // A control paints the icon tier that matches its size: `IconButton` maps
    // `sm`/`md`/`lg` to the same `iconSize` tier, and a slider's thumb is
    // `iconSize[size]` tall inside a `controlHeight[size]` track. The default
    // glyph against the smallest control is the rule above; this is each size's
    // own box. The control's two borders are painted inside its height.
    ...controlSizes.flatMap((size) =>
      atLeast(
        "density",
        `controlHeight.${size}`,
        density.controlHeight[size],
        iconSize[size] + 2 * borderWidth.thin,
      ),
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
    // sizes are bounded by the theme's own leading — not by a house literal. A
    // leading that is not a usable line is its own rule's diagnostic, so the
    // fit waits for one instead of blaming the icon.
    ...(usableBound(typography.caption.lineHeight)
      ? atMost("iconSize", "xs", iconSize.xs, typography.caption.lineHeight)
      : []),
    ...(usableBound(typography.label.lineHeight)
      ? atMost("iconSize", "sm", iconSize.sm, typography.label.lineHeight)
      : []),
    ...finiteGroup("avatarSize", avatarSize),
    ...ladder(
      "avatarSize",
      scaleSteps(avatarSize),
      "non-decreasing",
      "positive",
    ),
    // The `xs` tier is the inline avatar (`scale.ts`): a dense `ListItem` fixes
    // its height at `density.rowHeight` and documents its leading slot for an
    // avatar, so a mark taller than the row cannot fit the row it leads. A row
    // that is not a usable height is its own rule's diagnostic.
    ...(usableBound(density.rowHeight)
      ? atMost("avatarSize", "xs", avatarSize.xs, density.rowHeight)
      : []),
    ...finiteGroup("radius", radius),
    ...zero("radius", "none", radius.none),
    ...ladder(
      "radius",
      scaleSteps(radius).filter(([step]) => step !== "none" && step !== "full"),
      "non-decreasing",
    ),
    // `full` rounds the largest corner step the theme carries and half the
    // largest control and avatar it carries — not the shipped `xl`/`lg`.
    ...(largestCorner !== undefined && usableBound(largestCorner)
      ? atLeast("radius", "full", radius.full, largestCorner)
      : []),
    ...(largestControl !== undefined && usableBound(largestControl)
      ? atLeast("radius", "full", radius.full, largestControl / 2)
      : []),
    ...(largestAvatar !== undefined && usableBound(largestAvatar)
      ? atLeast("radius", "full", radius.full, largestAvatar / 2)
      : []),
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
    // A fixed mark the theme owns is a stroke the runtime paints. The timeline
    // marker already reads the rail it marks (plan 604); the Toast's tone bar,
    // the inbox's unread dot, a carousel indicator and an avatar's presence dot
    // are the same kind of mark and were only positive, so a tenth of a pixel
    // passed every check. A mark below the theme's own hairline is thinner than
    // the smallest stroke a border may paint. `usableBound` leaves a zero,
    // negative or non-finite value to the `positive` rule, so one bad mark keeps
    // one diagnostic (plans 641 and 643).
    ...fixedMarks.flatMap((member) =>
      usableBound(dimensions[member])
        ? atLeast("dimensions", member, dimensions[member], borderWidth.thin)
        : [],
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
    // A field's adornment is the square clear control inside a field:
    // `SearchInput`, the `TimePicker`, the `HotkeyRecorder` and the TagInput
    // chip's remove control all spread `textStyle(theme, "caption")` inside it.
    // The control paints no border, so only the line box is charged; a caption
    // leading taller than the square clips the glyph it centres.
    ...atLeast(
      "dimensions",
      "fieldAdornmentSize",
      dimensions.fieldAdornmentSize,
      typography.caption.lineHeight,
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
    // The preview card paints `spacing.lg` padding inside its own two borders,
    // so its minimum width has to leave a content box. `spacing["2xs"]` is the
    // hairline step a content box may not fall below (`preview-card.tsx`).
    ...atLeast(
      "dimensions",
      "previewCardMinWidth",
      dimensions.previewCardMinWidth,
      2 * spacing.lg + spacing["2xs"] + 2 * borderWidth.thin,
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
    // A chip's own minimum is an outer width — `TagInputChip` paints it as
    // `minWidth` — so its content box is the minimum less its two `spacing.sm`
    // insets. That box holds the caption label, the `spacing.xs` gap and the
    // `fieldAdornmentSize` remove control. Plan 384 declined this half because
    // the chip's padding was said to have no token; it is `spacing.sm`, so a
    // 10px chip passed every check with a negative content box (plan 667).
    ...atLeast(
      "dimensions",
      "chipMinWidth",
      dimensions.chipMinWidth,
      2 * spacing.sm +
        spacing.xs +
        typography.caption.fontSize +
        dimensions.fieldAdornmentSize,
    ),
    // The field's content box holds one of the two compositions its minimum
    // width exists for: a token-input chip, or the query row `docs/tokens.md`
    // documents — a leading icon, the query and a trailing action. Both sit
    // inside the field's two `borderWidth.thin` edges; the chip needs its
    // horizontal control padding, the query row paints the field's own
    // `spacing.md` padding and two gaps (`SearchInput`). The lead is the `md`
    // icon tier the component paints and the action is the adornment the token
    // names; the shipped tiers are equal, so the bound does not move (plans 634
    // and 645). The larger bound wins, so one value keeps one diagnostic.
    ...atLeast(
      "dimensions",
      "fieldMinWidth",
      dimensions.fieldMinWidth,
      Math.max(
        dimensions.chipMinWidth +
          2 * density.controlPaddingX.md +
          2 * borderWidth.thin,
        2 * spacing.md +
          iconSize.md +
          2 * spacing.md +
          typography.body.fontSize +
          dimensions.fieldAdornmentSize +
          2 * borderWidth.thin,
      ),
    ),
    // A dialog's shell holds its own close control: the surface's `spacing["2xl"]`
    // inset on the left, the greater of the shell's two `spacing["2xl"]` right
    // insets and the close control's reach (`spacing.lg + controlHeight.sm`) on
    // the right, and one `h3` title glyph, inside the face's two
    // `borderWidth.thin` edges (plans 627 and 645). The title wraps; the padding
    // and the control do not, so a narrower surface clips the chrome it always
    // paints (plan 625).
    ...atLeast(
      "dimensions",
      "dialogWidthSm",
      dimensions.dialogWidthSm,
      2 * borderWidth.thin +
        spacing["2xl"] +
        typography.h3.fontSize +
        shellCloseReserve,
    ),
    // A drawer's header is the dialog's: same inset, same close-control reserve
    // and the same `h3` title, inside its two borders. The width ladder carries
    // the bound to `md` and `lg`.
    ...atLeast(
      "dimensions",
      "drawerWidthSm",
      dimensions.drawerWidthSm,
      2 * borderWidth.thin +
        spacing["2xl"] +
        typography.h3.fontSize +
        shellCloseReserve,
    ),
    // A bottom drawer is a column: the close control's zone from the top edge
    // (`spacing.lg` plus the control, which is wider than the padding), one
    // `density.rowHeight` row and the bottom `spacing["2xl"]`, inside its two
    // borders. A shorter sheet is only its chrome (plan 625).
    ...atLeast(
      "dimensions",
      "drawerHeightSm",
      dimensions.drawerHeightSm,
      Math.max(spacing["2xl"], spacing.lg + density.controlHeight.sm) +
        density.rowHeight +
        spacing["2xl"] +
        2 * borderWidth.thin,
    ),
    // A date trigger paints its value and the `sm` disclosure icon inside its
    // own insets and gap; a field narrower than that chrome clips one of them.
    // The marker is the icon tier `Icon size="sm"` resolves to, not the caption
    // type (plan 632). A zero or non-finite width is its own rule's diagnostic.
    ...(usableBound(dimensions.dateFieldWidth)
      ? atLeast(
          "dimensions",
          "dateFieldWidth",
          dimensions.dateFieldWidth,
          3 * spacing.md +
            2 * borderWidth.thin +
            typography.label.fontSize +
            iconSize.sm,
        )
      : []),
    // A message viewport is one row inside its own padding and borders; a
    // theme that shrinks it to the row alone leaves no content box for that
    // row (`chat.tsx` paints `spacing.md` and two `borderWidth.thin` edges).
    ...atLeast(
      "dimensions",
      "chatViewportMinHeight",
      dimensions.chatViewportMinHeight,
      density.rowHeight + 2 * spacing.md + 2 * borderWidth.thin,
    ),
    // The active carousel mark may elongate; it may not shrink below the idle
    // dot it replaces.
    ...atLeast(
      "dimensions",
      "carouselIndicatorActiveWidth",
      dimensions.carouselIndicatorActiveWidth,
      dimensions.carouselIndicatorSize,
    ),
    // The timeline connector is `borderWidth.thin`; a marker thinner than the
    // rail it marks does not read as a dot. A zero marker is the positive
    // rule's single diagnostic, so the dependent rules wait for a usable one.
    ...(usableBound(dimensions.timelineMarkerSize)
      ? atLeast(
          "dimensions",
          "timelineMarkerSize",
          dimensions.timelineMarkerSize,
          borderWidth.thin,
        )
      : []),
    // The dot is centred in the column the rail occupies, so the column must
    // contain it: a marker wider than its column paints outside the rail. A
    // zero column is its own positive diagnostic, so the fit rule waits too.
    ...(usableBound(dimensions.timelineMarkerSize) &&
    usableBound(dimensions.timelineMarkerColumnWidth)
      ? atLeast(
          "dimensions",
          "timelineMarkerColumnWidth",
          dimensions.timelineMarkerColumnWidth,
          dimensions.timelineMarkerSize,
        )
      : []),
    // A dialog is offered in three sizes and "large" may not be narrower than
    // "medium": the surface a consumer asks for by name must grow.
    ...ladder(
      "dimensions",
      [
        ["dialogWidthSm", dimensions.dialogWidthSm],
        ["dialogWidthMd", dimensions.dialogWidthMd],
        ["dialogWidthLg", dimensions.dialogWidthLg],
      ],
      "increasing",
    ),
    // A calendar day is a control: a cell smaller than the theme's own small
    // control clips the label a reader clicks. A zero or non-finite control
    // height is the density rule's diagnostic, so the fit rule waits for a
    // usable bound.
    ...(usableBound(density.controlHeight.sm)
      ? atLeast(
          "dimensions",
          "calendarCellSize",
          dimensions.calendarCellSize,
          density.controlHeight.sm,
        )
      : []),
    // A time segment holds two body digits (`HH` or `MM`), so it is at least two
    // tabular digits wide; one em showed barely one digit at a 24px body role. A
    // zero or non-finite body size is its own rule's diagnostic, so the fit waits.
    ...(usableBound(typography.body.fontSize)
      ? atLeast(
          "dimensions",
          "timeSegmentWidth",
          dimensions.timeSegmentWidth,
          Math.ceil(2 * digitAdvanceEm * typography.body.fontSize),
        )
      : []),
    // A presence dot sits on the smallest avatar's corner, so it may not be
    // larger than half that avatar — the smallest the theme carries, not the
    // shipped `xs`.
    ...(smallestAvatar !== undefined && usableBound(smallestAvatar)
      ? atMost(
          "dimensions",
          "avatarPresenceDotSize",
          dimensions.avatarPresenceDotSize,
          smallestAvatar / 2,
        )
      : []),
    // The notification list scrolls: a viewport shorter than one row clips
    // every notification it holds.
    ...atLeast(
      "dimensions",
      "notificationListMaxHeight",
      dimensions.notificationListMaxHeight,
      density.rowHeight,
    ),
    // The inbox clips its contents, so its maximum height holds the header it
    // always paints — `spacing.lg` padding on both sides, a `sm` header action
    // (the density rule already holds that at least one `label` line tall) and
    // the header's own bottom rule — plus the list and the panel's two borders.
    // A panel capped at the list and its borders alone squeezes the header or
    // makes the documented list viewport unreachable (plan 629).
    ...atLeast(
      "dimensions",
      "notificationPanelMaxHeight",
      dimensions.notificationPanelMaxHeight,
      dimensions.notificationListMaxHeight +
        2 * spacing.lg +
        density.controlHeight.sm +
        3 * borderWidth.thin,
    ),
    // A Toast's fixed card holds its own chrome: the content row is `spacing.lg`
    // padding on both sides, the tone bar painted down the card's leading edge,
    // the `md` tone icon, the `lg` gap beside it, one `bodyStrong` title glyph,
    // the `lg` gap after the title and the square `sm` dismiss control
    // (`IconButton` is `controlHeight.sm` wide), inside the card's two
    // `borderWidth.thin` edges (plans 627, 631 and 636). The bar is a dimension
    // the theme owns, so the bound reads it; the action is optional and
    // label-sized, so it is content, not chrome. A zero or non-finite width is
    // the sign rule's diagnostic, so the fit waits for a usable value.
    ...(usableBound(dimensions.toastWidth)
      ? atLeast(
          "dimensions",
          "toastWidth",
          dimensions.toastWidth,
          2 * spacing.lg +
            dimensions.toastToneBarWidth +
            iconSize.md +
            spacing.lg +
            typography.bodyStrong.fontSize +
            spacing.lg +
            density.controlHeight.sm +
            2 * borderWidth.thin,
        )
      : []),
    // A notification row is `spacing.lg` padding on both sides, the unread dot,
    // the `sm` gap and one `bodyStrong` title glyph, and the inbox paints its two
    // `borderWidth.thin` edges inside its width (plan 627). The panel is anchored
    // at `notificationPanelWidth`, so a narrower panel clips the title of every
    // unread notification.
    ...(usableBound(dimensions.notificationPanelWidth)
      ? atLeast(
          "dimensions",
          "notificationPanelWidth",
          dimensions.notificationPanelWidth,
          2 * spacing.lg +
            dimensions.notificationUnreadDotSize +
            spacing.sm +
            typography.bodyStrong.fontSize +
            2 * borderWidth.thin,
        )
      : []),
    // The narrowest overlay row: the menu surface's `spacing.xs` padding on
    // both sides, a row's `spacing.md` padding on both sides, one `md` leading
    // icon (the `sm` trailing check and its gap are narrower), the `md` gap and
    // one `label` glyph, inside the menu surface's two `borderWidth.thin`
    // edges (plans 627 and 645). The 2px highlight bar is paid for out of the
    // row's left padding, so it does not widen the bound.
    ...(usableBound(dimensions.overlayMinWidth)
      ? atLeast(
          "dimensions",
          "overlayMinWidth",
          dimensions.overlayMinWidth,
          2 * spacing.xs +
            2 * spacing.md +
            iconSize.md +
            spacing.md +
            typography.label.fontSize +
            2 * borderWidth.thin,
        )
      : []),
    ...finiteGroup("elevation", elevation),
    ...elevationLevels.flatMap((level) => {
      const shapes = elevation[level];
      return [
        ...(shapes.length === 0 && level !== "overlay"
          ? [failure("elevation", level, "at-least", shapes.length, 1)]
          : []),
        // The runtime paints one shadow per element and `elevationShadow`
        // reads the first entry; a second shape is geometry nothing paints.
        ...atMost("elevation", level, shapes.length, 1),
        ...shapes.flatMap((shape, index) => [
          ...nonNegative(
            "elevation",
            `${level}[${index}].blurRadius`,
            shape.blurRadius,
          ),
          ...fraction("elevation", `${level}[${index}].alpha`, shape.alpha),
        ]),
      ];
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
