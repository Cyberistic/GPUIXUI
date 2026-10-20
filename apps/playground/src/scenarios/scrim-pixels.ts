/**
 * How the modal veil resolves in the frame, and the probe's fixture roles.
 *
 * The bug being guarded: the shipped `DialogContent` and `DrawerContent` dim the
 * window with a backdrop `div` whose only visible property is
 * `backgroundColor: theme.colors.overlay` (`dialog.tsx:245-256`,
 * `drawer.tsx:248-262`). **No scenario names either backdrop** — `tier2-dialog`
 * closes with Escape and `tier2-editing` presses the drawer's veil to dismiss it
 * — so a fully transparent veil, or one sized to the surface, would leave the
 * page readable behind a floating modal and pass every check.
 *
 * The roles are pure so the view and the expectations cannot disagree by
 * accident. The dark page roles (`primary #A7A9FF`, `success #3BC97F`), the
 * surface (`popover #222730`) and the 65 % black veil are far apart on the ramp,
 * and every load-bearing claim has a guard that must be distinguishable at the
 * frame's tolerance, or the check could not fail.
 */
import * as Arr from "effect/Array";
import { Pixels } from "@gpuixui/testing";
import type { ThemeColors } from "@gpuixui/tokens";

/** The five roles the probe paints, named by intent, not by shade. */
export interface ScrimFixtures {
  /** The page panel near the window's top-left. */
  readonly page: string;
  /** A second page fill at the opposite corner, to prove the veil's span. */
  readonly second: string;
  /** The modal surface's own fill. */
  readonly modal: string;
  /** The scrim over the page. */
  readonly veil: string;
  /** The window canvas behind both panels. */
  readonly stage: string;
}

export const scrimFixtures = (colors: ThemeColors): ScrimFixtures => ({
  page: colors.primary,
  second: colors.success,
  modal: colors.popover,
  veil: colors.overlay,
  stage: colors.background,
});

/**
 * The straight sRGB composite of the veil over a page fill.
 *
 * The runtime blends per channel and rounds to 8 bits (plan `701` measured it
 * for washes); the veil's own alpha is `rgba.a / 255`, so a palette edit moves
 * both the colour and the amount.
 */
export const veiled = (veil: Pixels.Rgba, page: Pixels.Rgba): Pixels.Rgba =>
  Pixels.blendOver(veil, veil.a / 255, page);

/**
 * The clear colour of an `<anchored>` layer, measured on 0.10.0 (plan `791`).
 *
 * An anchored layer is an **opaque** surface: the page below is not composited,
 * with or without `occlude`, and the layer paints this neutral plane. An
 * in-window `absolute`/`fixed` layer composites over the page instead, which is
 * the recipe the probe asserts. A runtime update that changes this base moves
 * the shipped-modals checks by name.
 */
export const ANCHORED_LAYER_BASE = "#1A1A1A";

/**
 * Whether the anchored route and the in-window route paint different pixels.
 *
 * The probe cannot tell them apart — and would pass with either — if the two
 * composites landed within the frame tolerance.
 */
export const routesDiffer = (
  veil: Pixels.Rgba,
  base: Pixels.Rgba,
  page: Pixels.Rgba,
  tolerance: number,
): boolean =>
  !Pixels.rgbaNear(veiled(veil, base), veiled(veil, page), tolerance);

/**
 * The four painted roles must be different colours.
 *
 * A palette edit that made `primary` and `success` the same, or `popover` equal
 * to `background`, would let every sample pass while proving nothing.
 */
export const distinctScrimRoles = (fixtures: ScrimFixtures): boolean => {
  const roles = [
    fixtures.page,
    fixtures.second,
    fixtures.modal,
    fixtures.stage,
  ];
  return Arr.length(Arr.dedupe(roles)) === Arr.length(roles);
};

/** Whether the veil moves the page further than the frame's tolerance. */
export const veilIsVisible = (
  veil: Pixels.Rgba,
  page: Pixels.Rgba,
  tolerance: number,
): boolean => !Pixels.rgbaNear(veiled(veil, page), page, tolerance);

/**
 * Whether the modal surface stays distinct from the veiled page.
 *
 * The surface is a child of the veil, so it must paint *above* it; a surface
 * sampled through the veil would read this expectation instead of its own fill.
 */
export const surfaceStandsOut = (
  veil: Pixels.Rgba,
  page: Pixels.Rgba,
  modal: Pixels.Rgba,
  tolerance: number,
): boolean => !Pixels.rgbaNear(veiled(veil, page), modal, tolerance);
