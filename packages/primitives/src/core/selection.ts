/**
 * Selection controls: a checkbox, a radio and a switch are three paints of one
 * three-state model (unchecked, checked, indeterminate) over the same metrics.
 *
 * The published runtime has **no `aria-checked`** (plan 020 §1.4), so a
 * component cannot announce the state natively; it reports the state through
 * `aria-valuetext`, and this module owns what that state *looks* like. Keeping
 * both in one place is what stops a Checkbox and a Switch disagreeing about what
 * "checked and disabled" means.
 */

import type { StyleDesc } from "@gpuix/react";
import { alpha, focusRing } from "@gpuixui/tokens";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { ControlSize, PrimitiveTheme } from "./theme.js";

export const SELECTION_STATES = [
  "unchecked",
  "checked",
  "indeterminate",
] as const;
export type SelectionState = (typeof SELECTION_STATES)[number];

/** Which accent paints a filled selection: the brand, or a destructive action. */
export const SELECTION_ACCENTS = ["primary", "destructive"] as const;
export type SelectionAccent = (typeof SELECTION_ACCENTS)[number];

export interface SelectionSpec {
  readonly state: SelectionState;
  readonly size: ControlSize;
  readonly accent: SelectionAccent;
  /** A box for a checkbox; a circle for a radio. Defaults to `square`. */
  readonly shape?: "square" | "circle";
  readonly invalid?: boolean;
  readonly disabled?: boolean;
  /**
   * Holds keyboard focus, so it paints the ring.
   *
   * Tracked by each control, not by the paint: GPUix has no `focusVisible`, so a
   * control learns it is focused from its own `onFocus`/`onBlur` and asks for
   * this. A focused control gets the one outline shape a `boxShadow` can draw.
   */
  readonly focused?: boolean;
}

const filled = (spec: SelectionSpec): boolean => spec.state !== "unchecked";

/** The background/foreground pair that paints a filled selection control. */
const accentRole = (
  spec: SelectionSpec,
  theme: PrimitiveTheme,
): { readonly background: string; readonly foreground: string } =>
  spec.accent === "destructive"
    ? {
        background: theme.colors.destructive,
        foreground: theme.colors.destructiveForeground,
      }
    : {
        background: theme.colors.primary,
        foreground: theme.colors.primaryForeground,
      };

/** The mark inside a filled checkbox/radio: a check, a dash, or the dot. */
export const selectionMarkColor = (
  spec: SelectionSpec,
  theme: PrimitiveTheme,
): string =>
  filled(spec)
    ? accentRole(spec, theme).foreground
    : spec.invalid === true
      ? theme.colors.destructive
      : theme.colors.mutedForeground;

/**
 * The square a checkbox or radio paints.
 *
 * The side is the theme's icon size for the control size, so a checkbox lines
 * up with the icon on the label beside it without a bespoke scale. Feedback is
 * declared: the border darkens on hover and takes the ring role while pressed.
 */
export const selectionBoxStyle = (
  spec: SelectionSpec,
  theme: PrimitiveTheme,
): StyleDesc => {
  const side = theme.iconSize[spec.size];
  const role = accentRole(spec, theme);
  const emptyBorder =
    spec.invalid === true ? theme.colors.destructive : theme.colors.input;
  const style: StyleDesc = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: side,
    height: side,
    flexShrink: 0,
    borderRadius: spec.shape === "circle" ? theme.radius.full : theme.radius.sm,
    borderWidth: theme.borderWidth.thin,
    borderColor: filled(spec) ? role.background : emptyBorder,
    backgroundColor: filled(spec) ? role.background : undefined,
    color: selectionMarkColor(spec, theme),
    cursor: spec.disabled === true ? "not-allowed" : "pointer",
    hover: filled(spec)
      ? {
          backgroundColor: alpha(role.background, 0.9),
          borderColor: alpha(role.background, 0.9),
        }
      : { borderColor: theme.colors.borderStrong },
    active: { borderColor: theme.colors.ring },
  };
  if (spec.disabled === true) {
    style.opacity = 0.5;
    // A disabled control must not respond to the pointer at all.
    style.hover = {
      backgroundColor: filled(spec) ? role.background : undefined,
      borderColor: filled(spec) ? role.background : emptyBorder,
    };
    style.active = {};
  }
  if (spec.focused === true) style.boxShadow = focusRing(theme).boxShadow;
  return style;
};

/** The pill's width as a multiple of its height (measured: 28×16 at `md`). */
const SWITCH_TRACK_RATIO = 1.75;

/** The thumb's side: the track height less one `2xs` inset on each edge. */
const switchThumbSide = (spec: SelectionSpec, theme: PrimitiveTheme): number =>
  theme.iconSize[spec.size] - theme.spacing["2xs"] * 2;

/** The track's painted width. */
export const switchTrackWidth = (
  spec: SelectionSpec,
  theme: PrimitiveTheme,
): number => Math.round(theme.iconSize[spec.size] * SWITCH_TRACK_RATIO);

/**
 * Where the thumb rests, inside the track's border.
 *
 * `position: "absolute"` measures `left`/`top` from the padding-box edge, so the
 * `2xs` inset the layout painter used is the resting `left`, and the checked
 * position is the content width less the inset and the thumb. Measured at `md`:
 * dx 3 / 13, dy 2 — the same box `justifyContent` painted (plan `329`).
 */
export const switchThumbOffset = (
  spec: SelectionSpec,
  theme: PrimitiveTheme,
): { readonly left: number; readonly top: number } => {
  const side = switchThumbSide(spec, theme);
  const border = theme.borderWidth.thin;
  const edge = theme.spacing["2xs"];
  return {
    left: filled(spec)
      ? switchTrackWidth(spec, theme) - border * 2 - edge - side
      : edge,
    top: Math.round((theme.iconSize[spec.size] - border * 2 - side) / 2),
  };
};

/**
 * The pill a switch slides in.
 *
 * Height is the box side, width a fixed ratio of it, so a switch is the same
 * "size" as the checkbox on the label beside it. The thumb is absolutely
 * positioned from `switchThumbOffset`, because the runtime can animate a
 * position but not a layout justification (plan `329`).
 */
export const switchTrackStyle = (
  spec: SelectionSpec,
  theme: PrimitiveTheme,
): StyleDesc => {
  const height = theme.iconSize[spec.size];
  const role = accentRole(spec, theme);
  const emptyBorder =
    spec.invalid === true ? theme.colors.destructive : theme.colors.input;
  const style: StyleDesc = {
    position: "relative",
    width: switchTrackWidth(spec, theme),
    height,
    flexShrink: 0,
    borderRadius: theme.radius.full,
    borderWidth: theme.borderWidth.thin,
    borderColor: filled(spec) ? role.background : emptyBorder,
    backgroundColor: filled(spec) ? role.background : theme.colors.muted,
    cursor: spec.disabled === true ? "not-allowed" : "pointer",
    hover: filled(spec)
      ? {
          backgroundColor: alpha(role.background, 0.9),
          borderColor: alpha(role.background, 0.9),
        }
      : { borderColor: theme.colors.borderStrong },
    active: { borderColor: theme.colors.ring },
  };
  if (spec.disabled === true) {
    style.opacity = 0.5;
    style.hover = {
      backgroundColor: filled(spec) ? role.background : theme.colors.muted,
      borderColor: filled(spec) ? role.background : emptyBorder,
    };
    style.active = {};
  }
  if (spec.focused === true) style.boxShadow = focusRing(theme).boxShadow;
  return style;
};

/**
 * The switch's thumb.
 *
 * The foreground role rather than a literal white, so it contrasts with the
 * track in both modes; the accent foreground once checked, so the knob always
 * reads against the pill it sits on.
 *
 * `pointerEvents: "none"` is load-bearing, not decoration: GPUI hit-tests to the
 * deepest element under the point and does not bubble an unhandled click to the
 * track, so a filled child covering the switch's centre swallowed every click
 * (measured: plan 041 §9 — the toggle never fired and the switch never took
 * focus). Its `left` is the motion target the component animates (plan `329`).
 */
export const switchThumbStyle = (
  spec: SelectionSpec,
  theme: PrimitiveTheme,
): StyleDesc => ({
  position: "absolute",
  ...switchThumbOffset(spec, theme),
  width: switchThumbSide(spec, theme),
  height: switchThumbSide(spec, theme),
  borderRadius: theme.radius.full,
  pointerEvents: "none",
  backgroundColor: filled(spec)
    ? accentRole(spec, theme).foreground
    : theme.colors.foreground,
});

/**
 * The centre dot of a checked radio.
 *
 * Half the box, so it reads as a filled pip inside the ring rather than a
 * second border; the colour is the same mark role the checkmark uses.
 */
export const radioDotStyle = (
  spec: SelectionSpec,
  theme: PrimitiveTheme,
): StyleDesc => {
  const side = Math.round(theme.iconSize[spec.size] / 2);
  return {
    width: side,
    height: side,
    flexShrink: 0,
    borderRadius: theme.radius.full,
    backgroundColor: selectionMarkColor(spec, theme),
  };
};

/**
 * The item a group should start its roving index on.
 *
 * The selection wins **only when it can be focused**: a selected but disabled
 * option must not become the tab stop, or every item ends up with `tabIndex`
 * `-1`/`undefined` and `Tab` skips the whole group. The fallback is the first
 * enabled option; an all-disabled group reports index 0 and makes no item
 * focusable.
 */
export interface SelectableOption {
  readonly value: string;
  readonly disabled?: boolean;
}

export const initialActiveIndex = <Item extends SelectableOption>(
  options: ReadonlyArray<Item>,
  value: string,
): number => {
  const indexOf = (matches: (option: Item) => boolean): number =>
    Option.getOrElse(Arr.findFirstIndex(options, matches), () => -1);
  const selected = indexOf(
    (option) => option.value === value && option.disabled !== true,
  );
  if (selected >= 0) return selected;
  return Math.max(
    indexOf((option) => option.disabled !== true),
    0,
  );
};
