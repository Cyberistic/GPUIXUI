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
import { interactionBorder } from "./style.js";
import type { ControlSize, PrimitiveTheme } from "./theme.js";

/** The states a selectable control paints: empty, filled, or neither. */
export const SELECTION_STATES = [
  "unchecked",
  "checked",
  "indeterminate",
] as const;
export type SelectionState = (typeof SELECTION_STATES)[number];

/**
 * The boolean activation reports from the state the control paints.
 *
 * A checked box clears; an empty or mixed one fills. A mixed box turns **on**,
 * the platform convention and `CheckboxGroup`'s select-all rule, so a caller
 * that also passes `checked` cannot make the paint and the activation disagree
 * (plan `750`).
 */
export const nextChecked = (state: SelectionState): boolean =>
  state !== "checked";

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
 * The side of the tick a box paints inside its border.
 *
 * The box's **content square**: the icon size for the control size less the
 * thin border on both sides. A tick is drawn in the space the border leaves, so
 * it scales with `size` instead of being pinned to one step (measured, plan
 * `640`: the 14 px tick stayed 14 in a 20 px `lg` box and overhung `sm`'s 12 px
 * content square, while the radio dot and switch thumb already scaled).
 */
export const selectionMarkSize = (
  size: ControlSize,
  theme: PrimitiveTheme,
): number => theme.iconSize[size] - 2 * theme.borderWidth.thin;

/**
 * The border an unfilled selection surface paints while interacting.
 *
 * Interaction feedback is a border change, so the healthy hover/press rule
 * would paint over a failed validation. Only an invalid, unfilled surface keeps
 * the destructive role; a filled one keeps its accent. The boundary decision is
 * `core/style.ts`'s `interactionBorder`, shared with the field family (plans
 * 356, 781).
 */
const selectionBorder = (
  spec: SelectionSpec,
  theme: PrimitiveTheme,
  fallback: string,
): string =>
  interactionBorder(theme, spec.invalid === true && !filled(spec), fallback);

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
      : {
          borderColor: selectionBorder(spec, theme, theme.colors.borderStrong),
        },
    active: { borderColor: selectionBorder(spec, theme, theme.colors.ring) },
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
  // A disabled control paints no ring: see `controlFocusStyle` (plan 332).
  if (spec.focused === true && spec.disabled !== true)
    style.boxShadow = focusRing(theme).boxShadow;
  return style;
};

/** How a data-driven selection group lays out the row it makes interactive. */
export interface SelectionRowSpec {
  readonly disabled?: boolean;
  /** `flex-start` when the row stacks a label over its description. */
  readonly align: "flex-start" | "center";
}

/**
 * The row a data-driven selection group makes interactive.
 *
 * `CheckboxGroup` and `RadioGroup` put the role, name, tab stop and both
 * handlers on the row, so the row is the control and owes the pointer the same
 * feedback every other control gives. The inner box keeps its own border
 * feedback; a wash on the row is what makes the label column — most of the hit
 * area — respond at all (plan `355`). A disabled row declares neither rule,
 * because an inert control must not respond (plan `332`).
 */
export const selectionRowStyle = (
  spec: SelectionRowSpec,
  theme: PrimitiveTheme,
): StyleDesc => {
  const style: StyleDesc = {
    display: "flex",
    flexDirection: "row",
    alignItems: spec.align,
    gap: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    cursor: spec.disabled === true ? "not-allowed" : "pointer",
    // A row is a flex item of the group, so it already shrinks; the automatic
    // content floor is what kept a long label at max-content and painted it
    // outside a horizontal group. Removing the floor lets the row shrink and
    // the label wrap (the D40 containment rule, measured in plan 380).
    minWidth: 0,
  };
  if (spec.disabled !== true) {
    style.hover = { backgroundColor: theme.colors.hover };
    style.active = { backgroundColor: theme.colors.active };
  }
  return style;
};

/**
 * The text column of a selection row: a name, and a caption under it.
 *
 * A row's label is one shrinkable run, and an optional description is a second
 * line in the same column rather than a sibling of the box — that is what keeps
 * the whole row one hit area and one accessibility node (plans `500`, `740`).
 */
export const selectionRowTextStyle = (theme: PrimitiveTheme): StyleDesc => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing["2xs"],
});

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
      : {
          borderColor: selectionBorder(spec, theme, theme.colors.borderStrong),
        },
    active: { borderColor: selectionBorder(spec, theme, theme.colors.ring) },
  };
  if (spec.disabled === true) {
    style.opacity = 0.5;
    style.hover = {
      backgroundColor: filled(spec) ? role.background : theme.colors.muted,
      borderColor: filled(spec) ? role.background : emptyBorder,
    };
    style.active = {};
  }
  if (spec.focused === true && spec.disabled !== true)
    style.boxShadow = focusRing(theme).boxShadow;
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
 *
 * `value` is `undefined` when the group has no selection. An option valued `""`
 * is a real choice ("None"), so absence must not be encoded as the empty string
 * — it would silently win the tab stop over the first enabled option (plan 502).
 */
export interface SelectableOption {
  readonly value: string;
  readonly disabled?: boolean;
}

/**
 * Whether a group reads as disabled: its own prop, or every option disabled.
 *
 * The group-level `StateStyle` state promises "every option is disabled"
 * (`docs/checkbox-group.mdx`, `radio-group.mdx`, `toggle-group.mdx`), while the
 * behaviour only needs the prop. An **empty** group is not disabled — it has no
 * option to disable (plan `639`).
 */
export const groupDisabled = (
  disabled: boolean,
  options: ReadonlyArray<SelectableOption>,
): boolean =>
  disabled ||
  (!Arr.isReadonlyArrayEmpty(options) &&
    Arr.every(options, (option) => option.disabled === true));

/** The group's tab stop: the selected option's index, else the first enabled one. */
export const initialActiveIndex = <Item extends SelectableOption>(
  options: ReadonlyArray<Item>,
  value: string | undefined,
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
