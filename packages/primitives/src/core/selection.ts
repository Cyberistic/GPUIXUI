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
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import * as Schema from "effect/Schema";
import * as Str from "effect/String";
import { pipe } from "effect";
import type { StyleDesc } from "@gpuix/react";
import {
  disabledOpacity,
  elevationShadow,
  filledHover,
  filledPressed,
  targetInset,
  targetSize,
} from "@gpuixui/tokens";
import type { SwitchColors } from "@gpuixui/tokens";
import type { ControlSize, PrimitiveTheme } from "./theme.js";
import { pressWash } from "./pointer.js";

/** One slot of the paint a platform's own switch declares. */
type SwitchSlot = "on" | "off" | "knob";

/** A declared switch paint, as a store wrote it: an open record. */
const DeclaredSwitch = Schema.Record(Schema.String, Schema.Unknown);
type DeclaredSwitch = typeof DeclaredSwitch.Type;

/** The one decoder for a stored table. */
const decodeDeclaredSwitch = Schema.decodeUnknownOption(DeclaredSwitch);

/**
 * A theme as a store can hand one back.
 *
 * `Theme.switch` is one control's paint table, and JSON has no `undefined`: a
 * stored theme writes the paint it did not carry as `null`, and a store can lose
 * a slot the same way. The switch seams decode that table as the unknown data it
 * is — the read `@gpuixui/tokens`' `switchFailures` makes — so a restored theme
 * paints the accent switch instead of throwing at its first slot.
 */
export type SwitchPaintTheme = Omit<PrimitiveTheme, "switch"> & {
  /** The stored table, as the store wrote it. */
  readonly switch?: unknown;
};

/**
 * The three colours a stored table carries, or `None` when it is no paint.
 *
 * A declaration is **whole** or it is nothing: the slots are one control's
 * paint, and a table that lost one cannot draw a coherent switch — the tokens'
 * report names the lost slot, and until it is repaired the control keeps the
 * accent toggle every base theme paints.
 */
const declaredPaint = (source: SwitchPaintTheme): Option.Option<SwitchColors> =>
  Option.flatMap(Option.fromNullishOr(source.switch), (table) =>
    Option.flatMap(decodeDeclaredSwitch(table), (paint) =>
      Option.all({
        on: declaredColour(paint, "on"),
        off: declaredColour(paint, "off"),
        knob: declaredColour(paint, "knob"),
      }),
    ),
  );

/**
 * The theme the switch paint reads: the declared table, or the accent switch.
 *
 * Parsing once at the seam is what keeps the rest of the module ordinary
 * `Theme` code, and what makes a stored theme's `null` unrepresentable past it.
 */
const switchTheme = (source: SwitchPaintTheme): PrimitiveTheme => ({
  ...source,
  switch: Option.getOrUndefined(declaredPaint(source)),
});

/** One declared slot's colour, or `None` when the store lost it. */
const declaredColour = (
  paint: DeclaredSwitch,
  slot: SwitchSlot,
): Option.Option<string> =>
  pipe(
    Option.fromNullishOr(paint[slot]),
    Option.filter(P.isString),
    Option.filter(Str.isNonEmpty),
  );

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
    // The fade's share is the token package's: `disabledFadeFailures`
    // composites that number, so a literal here would keep the old value when
    // the constant moves.
    style.opacity = disabledOpacity;
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
export const switchThumbInset = (theme: SwitchPaintTheme): number =>
  theme.spacing["2xs"];

/**
 * The pill a switch draws.
 *
 * A theme that carries a switch paint — a platform whose own toggle has fixed
 * metrics — draws the standard control at 51×31 with no edge, which is the
 * box Apple's HIG publishes. Its `sm` and `lg` sizes keep the icon-derived
 * steps, because the HIG specifies one switch and a compact or large one would
 * be a value Apple never ships. Every other theme keeps the derived box.
 */
export interface SwitchBox {
  /** Pill width in pixels. */
  readonly width: number;
  /** Pill height in pixels, which is also the knob's outer box. */
  readonly height: number;
  /** Edge thickness; the standard platform switch paints none. */
  readonly border: number;
}

/** Apple's switch: 51×31 points, with a 27pt knob at a 2pt inset. */
const APPLE_SWITCH = { width: 51, height: 31, border: 0 } as const;

/** The box a switch paints in, from the platform's paint and the size step. */
export const switchBox = (
  size: ControlSize,
  source: SwitchPaintTheme,
): SwitchBox => {
  const theme = switchTheme(source);
  return theme.switch !== undefined && size === "md"
    ? APPLE_SWITCH
    : {
        width: Math.round(theme.iconSize[size] * 1.75),
        height: theme.iconSize[size],
        border: theme.borderWidth.thin,
      };
};

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
 * width less one knob and both included borders: the same number a measured
 * drag would produce, without the measurement. It keeps the knob's gap to each
 * edge equal in the two states.
 */
export const switchThumbTravel = (
  spec: SelectionSpec,
  theme: SwitchPaintTheme,
): number => {
  const box = switchBox(spec.size, theme);
  return box.width - box.height - box.border * 2;
};

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
  theme: SwitchPaintTheme,
): number =>
  switchThumbInset(theme) + (filled(spec) ? switchThumbTravel(spec, theme) : 0);

/**
 * The fill a platform's own switch paints, or nothing for the accent family.
 *
 * A declared paint is a control's, not a role's: Apple's toggle is green on and
 * grey off whatever the accent is, so the accent family cannot derive it. Its
 * feedback is the same fill — a native switch does not tint to the pointer —
 * and an invalid off switch keeps the library's error colour, which is the one
 * state the HIG does not draw.
 *
 * A table a store **nulled** is no declaration, so the control paints the
 * accent switch; a slot the store lost falls back to the library's value for
 * that state, because a paint the renderer cannot read is not a paint.
 */
const switchFill = (
  spec: SelectionSpec,
  theme: PrimitiveTheme,
): string | undefined =>
  theme.switch === undefined
    ? undefined
    : filled(spec)
      ? theme.switch.on
      : spec.invalid === true
        ? theme.colors.destructive
        : theme.switch.off;

/**
 * The paint a platform's own switch declares, as a style the switch merges over
 * the accent recipe. Nothing when the theme carries no paint.
 */
export const switchTrackPaint = (
  spec: SelectionSpec,
  source: SwitchPaintTheme,
): StyleDesc | undefined => {
  const fill = switchFill(spec, switchTheme(source));
  return fill === undefined
    ? undefined
    : {
        backgroundColor: fill,
        borderColor: fill,
        hover: { backgroundColor: fill, borderColor: fill },
        active: { backgroundColor: fill, borderColor: fill },
      };
};

/** The knob's paint, which follows the track's declaration. */
export const switchThumbPaint = (
  source: SwitchPaintTheme,
): StyleDesc | undefined => {
  const theme = switchTheme(source);
  return theme.switch === undefined
    ? undefined
    : {
        backgroundColor: theme.switch.knob,
        boxShadow: elevationShadow(theme, "sm"),
      };
};

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
  source: SwitchPaintTheme,
): StyleDesc => {
  const theme = switchTheme(source);
  const box = switchBox(spec.size, source);
  const role = accentRole(spec, theme);
  const emptyBorder =
    spec.invalid === true
      ? theme.colors.destructive
      : theme.colors.borderStrong;
  const paint = switchTrackPaint(spec, source);
  const fill =
    paint?.backgroundColor ??
    (filled(spec) ? role.background : theme.colors.muted);
  const edge =
    paint?.borderColor ?? (filled(spec) ? role.background : emptyBorder);
  const style: StyleDesc = {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    width: box.width,
    height: box.height,
    flexShrink: 0,
    borderRadius: theme.radius.full,
    borderWidth: box.border,
    borderColor: edge,
    backgroundColor: fill,
    cursor: spec.disabled === true ? "not-allowed" : "pointer",
    hover:
      paint?.hover ??
      (filled(spec)
        ? feedbackFill(spec, theme, "hover")
        : { backgroundColor: theme.colors.hover }),
    active:
      paint?.active ??
      (filled(spec)
        ? feedbackFill(spec, theme, "press")
        : { backgroundColor: pressWash(theme) }),
  };
  if (spec.disabled === true) {
    style.opacity = disabledOpacity;
    style.hover = { backgroundColor: fill, borderColor: edge };
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
  source: SwitchPaintTheme,
): StyleDesc => {
  const theme = switchTheme(source);
  const paint = switchThumbPaint(source);
  const inset = switchThumbInset(source);
  const side = switchBox(spec.size, source).height - inset * 2;
  return {
    position: "absolute",
    top: inset,
    left: switchThumbOffset(spec, source),
    width: side,
    height: side,
    flexShrink: 0,
    borderRadius: theme.radius.full,
    pointerEvents: "none",
    backgroundColor:
      paint?.backgroundColor ??
      (filled(spec)
        ? accentRole(spec, theme).foreground
        : theme.colors.foreground),
    boxShadow: paint?.boxShadow,
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
