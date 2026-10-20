/**
 * How a declared `opacity` resolves in the frame, and the probe's fixture roles.
 *
 * The bug being guarded: eleven shipped surfaces express **disabled** as nothing
 * but `opacity: disabled ? 0.5 : 1` (list rows, tabs, accordion headers, menu
 * items, combobox rows and triggers, search fields, time pickers, inline edits,
 * hotkey recorders). The suite proves those surfaces are inert and that the
 * authored style report says `0.5`, but no check reads the frame — a runtime
 * that accepted `opacity` and dropped it would leave every disabled control
 * looking enabled.
 *
 * The fixture roles are pure so the view and the expectations cannot disagree by
 * accident; the frame is the other witness. Roles sit far apart on the ramp
 * (`background #11141A`, `card #191D25`, `primary #A7A9FF`,
 * `success #3BC97F`), and every load-bearing claim has a guard that must be
 * distinguishable at the frame's tolerance, or the check could not fail.
 */
import * as Arr from "effect/Array";
import { Pixels } from "@gpuixui/testing";
import type { ThemeColors } from "@gpuixui/tokens";

/** The declaration every shipped disabled surface uses. */
export const DISABLED_OPACITY = 0.5;

/** The seven boxes' fills, in role terms. */
export interface OpacityFixtures {
  /** An opaque box: the token must paint unchanged. */
  readonly rest: string;
  /** The same fill, dimmed to {@link DISABLED_OPACITY}. */
  readonly half: string;
  /** An opaque neighbour, so a dimmed fill cannot pass by painting the stage. */
  readonly away: string;
  /** A dimmed surface that contains {@link child}. */
  readonly parent: string;
  /** An opaque child inside the dimmed surface. */
  readonly child: string;
  /** The outer half of the nested pair. */
  readonly nested: string;
  /** A half-opacity child inside a half-opacity parent. */
  readonly nestedChild: string;
}

export const opacityFixtures = (colors: ThemeColors): OpacityFixtures => ({
  rest: colors.primary,
  half: colors.primary,
  away: colors.card,
  parent: colors.card,
  child: colors.success,
  nested: colors.card,
  nestedChild: colors.primary,
});

/** Nested opacities compose multiplicatively: `0.5` inside `0.5` is `0.25`. */
export const nestedOpacity = (outer: number, inner: number): number =>
  outer * inner;

/** The straight sRGB blend the runtime paints for a fill at `opacity`. */
export const opacityBlend = (
  fill: Pixels.Rgba,
  opacity: number,
  under: Pixels.Rgba,
): Pixels.Rgba => Pixels.blendOver(fill, opacity, under);

/**
 * A child at `inner` inside a parent at `outer`, as the frame composites it.
 *
 * The equivalent one-shot mix is `nestedOpacity(outer, inner)`, but the runtime
 * composites the parent's surface, then the child over it, then the group at the
 * parent's opacity — and rounds to 8 bits at each step. Plan `756` measured the
 * two agreeing within 2 channels, so the expectation models the **steps** rather
 * than the idealised product, and a 4-channel drift still fails.
 */
export const nestedPaint = (
  childFill: Pixels.Rgba,
  parentFill: Pixels.Rgba,
  outer: number,
  inner: number,
  under: Pixels.Rgba,
): Pixels.Rgba =>
  Pixels.blendOver(
    Pixels.blendOver(
      childFill,
      inner,
      Pixels.blendOver(parentFill, outer, under),
    ),
    outer,
    under,
  );

/** The three role fills a palette edit must keep apart. */
export const roleFills = (fixtures: OpacityFixtures): ReadonlyArray<string> => [
  fixtures.rest,
  fixtures.away,
  fixtures.child,
];

/**
 * Whether every role fill is a different colour.
 *
 * A palette edit that makes `card` and `primary` the same would let every
 * colour check pass while proving nothing, so the probe refuses the fixture
 * before it samples a frame.
 */
export const distinctRoles = (fixtures: OpacityFixtures): boolean => {
  const fills = roleFills(fixtures);
  return Arr.length(Arr.dedupe(fills)) === Arr.length(fills);
};

/**
 * Whether two samples are far enough apart to be a real check.
 *
 * `tolerance` is the frame comparison's per-channel slack: an expectation that
 * sits inside it could not fail if the runtime dropped the property.
 */
export const distinguishable = (
  left: Pixels.Rgba,
  right: Pixels.Rgba,
  tolerance: number,
): boolean => !Pixels.rgbaNear(left, right, tolerance);
