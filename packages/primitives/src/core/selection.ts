/**
 * Selection controls: a checkbox, a radio and a switch are three paints of one
 * three-state model (unchecked, checked, indeterminate) over the same metrics.
 *
 * The published runtime has **no `aria-checked`** (see `docs/gpuix-capabilities.md`), so a
 * component cannot announce the state natively; it reports the state through
 * `aria-valuetext`, and this module owns what that state *looks* like. Keeping
 * both in one place is what stops a Checkbox and a Switch disagreeing about what
 * "checked and disabled" means.
 */

import * as Arr from "effect/Array";
import type { StyleDesc } from "@gpuix/react";
import {
  filledHover,
  filledPressed,
  targetInset,
  targetSize,
} from "@gpuixui/tokens";
import type { ControlSize, PrimitiveTheme } from "./theme.js";
import { pressWash } from "./pointer.js";

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
 * The fill a filled selection control paints while hovered or pressed.
 *
 * Derived from the theme and **opaque**, like a filled action's feedback: a
 * half-alpha lift (`alpha(primary, 0.9)`) let the surface behind the box
 * through, so the same checked box read as two colours on a card and on a
 * dialog, and the mark painted over it could not be measured for contrast at
 * all. The edge goes transparent with it — the fill *is* the edge once the box
 * is filled, and a resting role left on the border would draw a 1px ring of the
 * old colour around the new fill.
 */
const feedbackFill = (
  spec: SelectionSpec,
  theme: PrimitiveTheme,
  phase: "hover" | "press",
): StyleDesc => ({
  backgroundColor:
    phase === "hover"
      ? filledHover(theme, spec.accent)
      : filledPressed(theme, spec.accent),
  borderColor: "transparent",
});

/**
 * The square a checkbox or radio paints.
 *
 * The side is the theme's icon size for the control size, so a checkbox lines
 * up with the icon on the label beside it without a bespoke scale. An empty box
 * is carried by its edge, so that edge is the measured control-boundary role
 * (`borderStrong`, 3:1 on every strip a control sits on) rather than a fill
 * role — `input` is the card's own white in the light theme. Feedback is a state
 * wash under the mark, so the edge survives hover and press, including a
 * destructive one.
 */
export const selectionBoxStyle = (
  spec: SelectionSpec,
  theme: PrimitiveTheme,
): StyleDesc => {
  const side = theme.iconSize[spec.size];
  const role = accentRole(spec, theme);
  const emptyBorder =
    spec.invalid === true
      ? theme.colors.destructive
      : theme.colors.borderStrong;
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
      ? feedbackFill(spec, theme, "hover")
      : { backgroundColor: theme.colors.hover },
    active: filled(spec)
      ? feedbackFill(spec, theme, "press")
      : { backgroundColor: pressWash(theme) },
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
  return style;
};

/** The gap a switch thumb keeps from the track's edge, on every side. */
export const switchThumbInset = (theme: PrimitiveTheme): number =>
  theme.spacing["2xs"];

/**
 * The box a selection control reserves around its drawing.
 *
 * The drawing is the icon-sized square that lines up with a label's icon; the
 * *target* is what a pointer has to hit, and WCAG 2.2 SC 2.5.8 puts a 24px floor
 * under it. `targetInset` is the shared arithmetic, so a checkbox keeps its
 * drawn size and gains only the padding a reachable target needs. The control's
 * role, focus and ring live on this box, and the drawing inside it is
 * `pointerEvents: "none"` — a press anywhere in the square activates once.
 */
export const selectionTargetStyle = (
  spec: SelectionSpec,
  theme: PrimitiveTheme,
): StyleDesc => {
  const side = theme.iconSize[spec.size];
  const inset = targetInset(side);
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: side + inset * 2,
    height: side + inset * 2,
    flexShrink: 0,
    cursor: spec.disabled === true ? "not-allowed" : "pointer",
  };
};

/**
 * The box a switch reserves around its track.
 *
 * The track is a pill one icon-height tall, shorter than the floor, so the
 * target keeps the pill's width and grows vertically: the press box is a
 * 24px-high band with the pill centred in it.
 */
export const switchTargetStyle = (spec: SelectionSpec): StyleDesc => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: targetSize.minimum,
  flexShrink: 0,
  cursor: spec.disabled === true ? "not-allowed" : "pointer",
});

/**
 * How far a switch thumb travels between its two positions.
 *
 * The track is a fixed ratio of the icon side, so the travel is the track's
 * width less one thumb and both included borders: the same number a measured
 * drag would produce, without the measurement. It keeps the knob's gap to each
 * edge equal in the two states.
 */
export const switchThumbTravel = (
  spec: SelectionSpec,
  theme: PrimitiveTheme,
): number =>
  Math.round(theme.iconSize[spec.size] * 1.75) -
  theme.iconSize[spec.size] -
  theme.borderWidth.thin * 2;

/**
 * A switch thumb's offset from the track's left edge.
 *
 * The resting offset is {@link switchThumbInset}; a filled track adds the whole
 * travel, so the two positions differ by exactly the distance between them and
 * the thumb never drifts out of the pill. It is an offset rather than
 * `justifyContent` because the runtime can animate a `left` inset (it cannot
 * animate a flex alignment), which is what makes the knob slide.
 */
export const switchThumbOffset = (
  spec: SelectionSpec,
  theme: PrimitiveTheme,
): number =>
  switchThumbInset(theme) + (filled(spec) ? switchThumbTravel(spec, theme) : 0);

/**
 * The pill a switch slides in.
 *
 * Height is the box side, width a fixed ratio of it, so a switch is the same
 * "size" as the checkbox on the label beside it. It is the thumb's positioning
 * context: the thumb is an absolutely positioned child, so only its `left`
 * decides where it sits.
 */
export const switchTrackStyle = (
  spec: SelectionSpec,
  theme: PrimitiveTheme,
): StyleDesc => {
  const height = theme.iconSize[spec.size];
  const role = accentRole(spec, theme);
  const emptyBorder =
    spec.invalid === true
      ? theme.colors.destructive
      : theme.colors.borderStrong;
  const style: StyleDesc = {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    width: Math.round(height * 1.75),
    height,
    flexShrink: 0,
    borderRadius: theme.radius.full,
    borderWidth: theme.borderWidth.thin,
    borderColor: filled(spec) ? role.background : emptyBorder,
    backgroundColor: filled(spec) ? role.background : theme.colors.muted,
    cursor: spec.disabled === true ? "not-allowed" : "pointer",
    hover: filled(spec)
      ? feedbackFill(spec, theme, "hover")
      : { backgroundColor: theme.colors.hover },
    active: filled(spec)
      ? feedbackFill(spec, theme, "press")
      : { backgroundColor: pressWash(theme) },
  };
  if (spec.disabled === true) {
    style.opacity = 0.5;
    style.hover = {
      backgroundColor: filled(spec) ? role.background : theme.colors.muted,
      borderColor: filled(spec) ? role.background : emptyBorder,
    };
    style.active = {};
  }
  return style;
};

/**
 * The switch's thumb.
 *
 * The foreground role rather than a literal white, so it contrasts with the
 * track in both modes; the accent foreground once checked, so the knob always
 * reads against the pill it sits on. It is an absolutely positioned child of
 * the track at {@link switchThumbOffset}, which is the one value the slide
 * animates.
 *
 * `pointerEvents: "none"` is load-bearing, not decoration: GPUI hit-tests to the
 * deepest element under the point and does not bubble an unhandled click to the
 * track, so a filled child covering the switch's centre swallowed every click
 * (measured in `runtime/controls.runtime.test.tsx` — the toggle never fired
 * and the switch never took focus).
 */
export const switchThumbStyle = (
  spec: SelectionSpec,
  theme: PrimitiveTheme,
): StyleDesc => {
  const inset = switchThumbInset(theme);
  const side = theme.iconSize[spec.size] - inset * 2;
  return {
    position: "absolute",
    top: inset,
    left: switchThumbOffset(spec, theme),
    width: side,
    height: side,
    flexShrink: 0,
    borderRadius: theme.radius.full,
    pointerEvents: "none",
    backgroundColor: filled(spec)
      ? accentRole(spec, theme).foreground
      : theme.colors.foreground,
  };
};

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
 * Turn one value's membership in a selection on or off.
 *
 * A checkbox group and a `multiple` toggle group hold the values that are on;
 * pressing an option adds it or removes it without touching the others. A
 * `single` group keeps at most one value, and pressing the active one clears
 * the selection — the toggle's own semantics, unlike a radio group, which
 * always has a value.
 */
export const toggleSelection = (
  mode: "single" | "multiple",
  current: ReadonlyArray<string>,
  value: string,
): ReadonlyArray<string> =>
  mode === "single"
    ? Arr.contains(current, value)
      ? []
      : [value]
    : Arr.contains(current, value)
      ? Arr.filter(current, (item) => item !== value)
      : [...current, value];
