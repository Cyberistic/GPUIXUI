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
import { alpha } from "./color.js";
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
  return style;
};

/**
 * The pill a switch slides in.
 *
 * Height is the box side, width a fixed ratio of it, so a switch is the same
 * "size" as the checkbox on the label beside it. The thumb is positioned by
 * `justifyContent`, not by a pixel offset, so it cannot drift out of the pill.
 */
export const switchTrackStyle = (
  spec: SelectionSpec,
  theme: PrimitiveTheme,
): StyleDesc => {
  const height = theme.iconSize[spec.size];
  const role = accentRole(spec, theme);
  const style: StyleDesc = {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    width: Math.round(height * 1.75),
    height,
    flexShrink: 0,
    borderRadius: theme.radius.full,
    padding: theme.spacing["2xs"],
    borderWidth: theme.borderWidth.thin,
    borderColor: filled(spec) ? role.background : theme.colors.input,
    backgroundColor: filled(spec) ? role.background : theme.colors.muted,
    justifyContent: filled(spec) ? "flex-end" : "flex-start",
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
      borderColor: filled(spec) ? role.background : theme.colors.input,
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
 * reads against the pill it sits on.
 */
export const switchThumbStyle = (
  spec: SelectionSpec,
  theme: PrimitiveTheme,
): StyleDesc => {
  const inset = theme.spacing["2xs"] * 2;
  const side = theme.iconSize[spec.size] - inset;
  return {
    width: side,
    height: side,
    flexShrink: 0,
    borderRadius: theme.radius.full,
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
