/**
 * The scale contract: a named scale is an order, and a theme that carries one
 * must keep it.
 *
 * Every scale in a theme names a *ladder* — spacing from `2xs` to `5xl`, radii
 * from `none` to `full`, control sizes from `sm` to `lg`, type from `caption` to
 * `display`, elevation from `sm` to `lg`. A component selects a step by name:
 * `size="sm"` asks for the small control, `radius="xl"` for the large surface,
 * `textStyle(theme, "h3")` for the heading under an `h2`, `elevationShadow(theme,
 * "lg")` for the surface furthest from the page. When the numbers behind those
 * names stop increasing, the name lies — a `size="sm"` control paints taller
 * than `size="lg"`, a dialog is squarer than the card beneath it, a heading is
 * smaller than its body text, a dialog casts a tighter shadow than a menu — and
 * nothing in the renderer complains, because each value is still a perfectly
 * valid number. Radius is the one ladder where two names may share a corner:
 * Fluent 2 gives every control 4px and every surface 8px, so `sm`/`md` and
 * `lg`/`xl` are aliases on purpose; a smaller rung is still a lie.
 *
 * Elevation is the one ladder whose rung is not a single token: a level is a
 * geometry plus a share of the `shadow` role, so its depth is the distance the
 * shadow reaches below the box it lifts — `offsetY + blurRadius + spreadRadius`
 * of the shadow `elevationShadow` paints. The colour is the role's and the
 * horizontal offset is not depth, so neither is read; a level a brand deepens by
 * opacity alone is a heavier shadow, not a higher surface.
 *
 * The shipped scales are held to this order by `scale.test.ts` and
 * `typography.test.ts`, and every shipped theme's elevation by this file's own
 * sweep; this is the same rule for a theme a brand supplied, in the shape the
 * other token contracts use. `invalidNumbers` answers whether one number can be
 * laid out; this answers whether two adjacent steps still describe different
 * sizes.
 *
 * A value that is not finite is skipped rather than reported twice: it cannot be
 * laid out at all, and `invalidNumbers` already names it.
 *
 * `invalidScales` is not one of `auditTheme`'s reports yet. The audit's report
 * list is printed by the docs site's theme readout, which words every report, so
 * folding this in is one coordinated change with that page — recorded in
 * `TODO.md` → Interlocks. Run it beside `auditTheme` until then.
 */

import {
  type BoxShadow,
  type Elevation,
  elevationLevels,
} from "./elevation.js";
import {
  controlSizes,
  type BorderWidth,
  type ControlSize,
  type IconSize,
  type Radius,
  type Spacing,
} from "./scale.js";
import type { Theme } from "./theme.js";
import type { TextRole } from "./typography.js";

/** The scales a theme carries, in the order the catalogue lists them. */
export type ScaleGroup =
  | "spacing"
  | "radius"
  | "borderWidth"
  | "iconSize"
  | "typography"
  | "density"
  | "elevation";

/**
 * One step that does not exceed the step before it in its scale's documented
 * order, so the two names no longer describe two sizes.
 */
export interface InvalidScale {
  /** The scale the step belongs to. */
  readonly group: ScaleGroup;
  /** The step that breaks the order: `xl`, `controlHeight.md`, `h2.fontSize`. */
  readonly path: string;
  /**
   * The value the theme carries for it. For an `elevation` step this is the
   * level's **reach** — the distance its painted shadow extends below the box,
   * `offsetY + blurRadius + spreadRadius` — because a level's depth is a
   * geometry rather than one token.
   */
  readonly value: number;
  /** The preceding step, which it must exceed. */
  readonly previous: {
    /** That step's path in the same group. */
    readonly path: string;
    /** Its value. */
    readonly value: number;
  };
}

/** The fields the scale audit reads: every ordered group of a theme. */
export type ScaleSource = Pick<
  Theme,
  "spacing" | "radius" | "borderWidth" | "iconSize" | "density"
> & {
  /**
   * The type roles the theme carries, keyed by name. A role it omits is skipped
   * rather than reported — a theme restored from storage can predate a role the
   * library added, and the gate refuses that absence by name (`requireSteps`),
   * because a component selects a role by name and cannot paint around one.
   */
  readonly typography: Partial<Record<TextRole, { readonly fontSize: number }>>;
  /**
   * Every elevation level the theme carries. A level it omits is skipped rather
   * than reported: a theme restored from storage can predate a level the
   * library added, and the missing level is `invalidShadowColors`' business. An
   * absent group is the same rule one level up — a store that predates the
   * scale has no rung to compare, and the shadow report names every level.
   */
  readonly elevation?: Partial<Elevation>;
};

/** Spacing steps from tightest to loosest. */
const spacingKeys = [
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
] as const;

/** Radii from sharpest to roundest. */
const radiusKeys = ["none", "sm", "md", "lg", "xl", "full"] as const;

/** Border weights from a divider to an emphasis line. */
const borderKeys = ["thin", "strong"] as const;

/** Icon steps from inline to navigation. */
const iconKeys = ["xs", "sm", "md", "lg", "xl"] as const;

/**
 * The type hierarchy, smallest to largest. `bodyStrong` shares `body`'s size and
 * differs by weight, and the two mono roles are a separate family rather than
 * rungs of this ladder, so neither joins it.
 */
const typeKeys = [
  "caption",
  "label",
  "body",
  "h3",
  "h2",
  "h1",
  "display",
] as const satisfies readonly TextRole[];

/**
 * The type roles that are deliberately not rungs of the size ladder, with the
 * reason each one is left out. A role added to the type scale has to be sorted
 * into `typeKeys` or named here, so no role can arrive unmeasured.
 */
const notRungs = {
  /** Shares `body`'s size and differs by weight; `invalidNumbers` holds the pair. */
  bodyStrong: "emphasis",
  /** A separate family rather than a size between the UI steps. */
  code: "mono",
  codeBlock: "mono",
} as const satisfies Partial<Record<TextRole, string>>;

/**
 * A step the ladder does not list, as a build error.
 *
 * A scale is data and its ladder is the order the contract compares, so a step
 * added to a scale is one list away from shipping unmeasured: the shipped theme
 * would carry a size `invalidScales` never compares, and a brand could invert
 * the new rung in silence. The assignment below fails the package's type check
 * with the missing step named, so the ladder and the scale move together.
 */
type EveryStepListed<Step extends string, Listed extends Step> =
  Exclude<Step, Listed> extends never
    ? true
    : ["a scale step is missing from its order ladder", Exclude<Step, Listed>];

const spacingLadder: EveryStepListed<
  keyof Spacing,
  (typeof spacingKeys)[number]
> = true;
const radiusLadder: EveryStepListed<keyof Radius, (typeof radiusKeys)[number]> =
  true;
const borderLadder: EveryStepListed<
  keyof BorderWidth,
  (typeof borderKeys)[number]
> = true;
const iconLadder: EveryStepListed<keyof IconSize, (typeof iconKeys)[number]> =
  true;
const typeLadder: EveryStepListed<
  TextRole,
  (typeof typeKeys)[number] | keyof typeof notRungs
> = true;

// Keep the guards live under `noUnusedLocals`; the values are never produced.
void spacingLadder;
void radiusLadder;
void borderLadder;
void iconLadder;
void typeLadder;

type Step = readonly [path: string, value: number];

/** Pair each named step with the value a theme carries for it. */
const keyed = <Key extends string>(
  keys: readonly Key[],
  read: (key: Key) => number,
): readonly Step[] => keys.map((key) => [key, read(key)] as const);

/** Pair each control size with the value a metric carries for it. */
const sized = (
  prefix: string,
  read: (size: ControlSize) => number,
): readonly Step[] =>
  controlSizes.map((size) => [`${prefix}.${size}`, read(size)] as const);

/**
 * The distance a level's shadow reaches below the box it lifts. The blur spreads
 * in every direction and the spread grows the box the blur starts from, so the
 * softest edge sits `offsetY + blurRadius + spreadRadius` below the surface.
 */
const reach = ({ offsetY, blurRadius, spreadRadius }: BoxShadow): number =>
  offsetY + blurRadius + spreadRadius;

/**
 * Every level that paints a shadow, paired with its reach, in the order a
 * surface is raised through them.
 *
 * A level the theme omits and the reserved empty `overlay` both paint nothing, so
 * neither is a rung and neither is compared. A geometry that cannot be laid out
 * is skipped for the same reason `ordered` skips one: `invalidNumbers` owns it,
 * and dropping it here keeps the rungs above it compared against the last level
 * that paints. A level carrying more than one shadow is read at the entry
 * `elevationShadow` paints, which is the only one the level renders.
 */
const elevationSteps = (
  elevation: Partial<Elevation> | undefined,
): readonly Step[] =>
  elevationLevels.flatMap((level) => {
    const shadow = elevation?.[level]?.[0];
    if (shadow === undefined) {
      return [];
    }
    const value = reach(shadow);
    return Number.isFinite(value) ? [[level, value] as const] : [];
  });

/**
 * Report every step that does not exceed the one before it. Two adjacent values
 * that cannot be laid out are skipped — reporting them here would duplicate
 * `invalidNumbers` and say nothing about the order.
 *
 * `allowEqual` is for a scale whose adjacent names are allowed to share a
 * corner: Fluent 2 rounds every control at 4px and every surface at 8px, so a
 * platform's `sm`/`md` and `lg`/`xl` are equal on purpose. A smaller step is
 * still a lie; an equal one is a named alias.
 */
const ordered = (
  group: ScaleGroup,
  steps: readonly Step[],
  allowEqual = false,
): readonly InvalidScale[] =>
  steps.slice(1).flatMap(([path, value], offset) => {
    const previous = steps[offset];
    if (previous === undefined) {
      return [];
    }
    const [previousPath, previousValue] = previous;
    if (!Number.isFinite(value) || !Number.isFinite(previousValue)) {
      return [];
    }
    return value > previousValue || (allowEqual && value === previousValue)
      ? []
      : [
          {
            group,
            path,
            value,
            previous: { path: previousPath, value: previousValue },
          },
        ];
  });

/**
 * Every pair of adjacent steps in a theme that does not describe two sizes.
 *
 * A scale is a ladder, and each rung has to be above the one below it: spacing
 * from `2xs` to `5xl`, radii from `none` to `full` (equal adjacent radii are
 * allowed — two names may share a corner), `thin` under `strong`, icons from
 * `xs` to `xl`, control heights and horizontal padding from `sm` to `lg`, type
 * sizes from `caption` to `display`, and each elevation level reaching further
 * below its surface than the level under it. A brand that computes a scale from
 * a factor, forwards stored values, or edits one rung can invert or repeat a
 * pair while every number stays layable — and the component that selects a rung
 * by name then paints the wrong size in silence.
 *
 * An empty array means every named step in the theme is at least as large as the
 * one before it. A value that is not finite is left to `invalidNumbers`, so a
 * broken radius is reported once, by the contract that owns it. An elevation
 * level is compared by the reach of the shadow it paints (`offsetY + blurRadius
 * + spreadRadius`), because a level is a geometry rather than one token; a level
 * a theme does not carry, and the reserved empty `overlay`, paint nothing and are
 * not rungs.
 *
 * @example
 * ```ts
 * import { extendTheme, invalidScales, lightTheme } from "@gpuixui/tokens";
 *
 * invalidScales(lightTheme); // []
 * invalidScales(
 *   extendTheme(lightTheme, { radius: { xl: 6 } }),
 * );
 * // [{ group: "radius", path: "xl", value: 6,
 * //    previous: { path: "lg", value: 8 } }]
 * ```
 */
export function invalidScales(theme: ScaleSource): readonly InvalidScale[] {
  return [
    ...ordered(
      "spacing",
      keyed(spacingKeys, (key) => theme.spacing[key]),
    ),
    ...ordered(
      "radius",
      keyed(radiusKeys, (key) => theme.radius[key]),
      true,
    ),
    ...ordered(
      "borderWidth",
      keyed(borderKeys, (key) => theme.borderWidth[key]),
    ),
    ...ordered(
      "iconSize",
      keyed(iconKeys, (key) => theme.iconSize[key]),
    ),
    ...ordered(
      "typography",
      // A role the theme does not carry is not a rung: comparing across the gap
      // would report the steps either side of a name nothing can select.
      typeKeys.flatMap((role) => {
        const style = theme.typography[role];
        return style === undefined
          ? []
          : [[`${role}.fontSize`, style.fontSize] as const];
      }),
    ),
    ...ordered(
      "density",
      sized("controlHeight", (size) => theme.density.controlHeight[size]),
    ),
    ...ordered(
      "density",
      sized("controlPaddingX", (size) => theme.density.controlPaddingX[size]),
    ),
    ...ordered("elevation", elevationSteps(theme.elevation)),
  ];
}
