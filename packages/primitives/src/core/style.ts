/**
 * The single point where a semantic decision becomes a GPUix `StyleDesc`.
 *
 * GPUix has no CSS: every visual property is a JavaScript value on the element.
 * If components built those values themselves, the library would have as many
 * design systems as it has components. So each component describes *what it is*
 * — a `ControlSpec`, a `TextSpec`, a `SurfaceSpec` — and this module decides how
 * that looks, once, from the theme.
 *
 * Everything here is pure, which is also what makes the visual layer provable
 * without a rendering runtime (see
 * `.agents/slop/plans/020-gpuix-runtime-capability.md` §3).
 */

import type { StyleDesc } from "@gpuix/react";
import * as Option from "effect/Option";
import type {
  ColorRef,
  ControlSize,
  ElevationLevel,
  PrimitiveTheme,
  RadiusStep,
  SpaceStep,
  TextRole,
  ThemeShadow,
} from "./theme.js";

/**
 * A colour reference into the theme, or nothing at all.
 *
 * A spec deliberately has *no* background rather than a transparent one: an
 * absent paint leaves the surface alone, which is what makes a ghost control
 * work without relying on the runtime understanding `transparent`.
 */
type Paint = ColorRef | undefined;

const paint = (ref: Paint, theme: PrimitiveTheme): string | undefined =>
  Option.getOrUndefined(
    Option.map(Option.fromNullishOr(ref), (colorRef) => colorRef(theme)),
  );

/** The outline GPUix draws as a shadow: a ring with no offset, spread and no blur. */
const RING_WIDTH = 2;

/**
 * A focus ring.
 *
 * GPUix 0.10.0's `StyleDesc` has **no `focusVisible` state and no `outline*`
 * properties** — those exist only on GPUix's unreleased `main`. So the ring is
 * a zero-offset, zero-blur shadow with a spread, the one shape `boxShadow` can
 * draw that behaves like an outline and takes no layout space. The component
 * applies it while focused, so a mouse press shows the ring too; there is no
 * `:focus-visible` to distinguish a Tab from a click. That limitation is
 * recorded in `COMPONENTS.md`.
 */
const ring = (color: string): StyleDesc => ({
  boxShadow: {
    offsetX: 0,
    offsetY: 0,
    blurRadius: 0,
    spreadRadius: RING_WIDTH,
    color,
  },
});

/** GPUix paints one shadow per element; a level's list resolves to its first. */
const firstShadow = (
  shadows: ReadonlyArray<ThemeShadow>,
): Option.Option<ThemeShadow> => Option.fromNullishOr(shadows[0]);

// ── Controls: Button, Input, Select ──────────────────────────────────

/** A variant is a set of colour references, not colours. */
export interface ControlVariant {
  /** Absent for an outline or ghost control: it paints no fill at rest. */
  readonly background: Paint;
  readonly foreground: ColorRef;
  readonly border: Paint;
  /**
   * Declared verbatim in `style.hover`. A variant must give some feedback — a
   * change of fill, of border or of decoration — so this is not optional.
   */
  readonly hover: (theme: PrimitiveTheme) => StyleDesc;
  readonly active: (theme: PrimitiveTheme) => StyleDesc;
}

/** The gap between a control's icon and its label, on the spacing scale. */
const CONTROL_GAP: SpaceStep = "sm";

export interface ControlSpec {
  readonly variant: ControlVariant;
  readonly size: ControlSize;
  /** Equal width and height, and no horizontal padding: an icon-only control. */
  readonly square?: boolean;
  readonly fullWidth?: boolean;
  readonly disabled?: boolean;
  /** Validation failed: the border and ring switch to the destructive role. */
  readonly invalid?: boolean;
}

/**
 * Resolve a control's chrome.
 *
 * Hover and active are **declared** in `style.hover`/`style.active`, which GPUI
 * applies natively — no `onMouseEnter` state, no re-render per pointer move.
 */
export const controlStyle = (
  spec: ControlSpec,
  theme: PrimitiveTheme,
): StyleDesc => {
  const { variant, size } = spec;
  const height = theme.density.controlHeight[size];
  const padding = theme.density.controlPaddingX[size];
  const label = theme.typography.label;
  const rest =
    spec.invalid === true
      ? theme.colors.destructive
      : paint(variant.background, theme);
  const border =
    spec.invalid === true
      ? theme.colors.destructive
      : paint(variant.border, theme);

  const style: StyleDesc = {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing[CONTROL_GAP],
    height,
    borderRadius: theme.radius.md,
    fontSize: label.fontSize,
    lineHeight: label.lineHeight,
    fontWeight: label.fontWeight,
    backgroundColor: rest,
    color: paint(variant.foreground, theme),
    borderWidth: variant.border === undefined ? 0 : theme.borderWidth.thin,
    borderColor: border,
    paddingLeft: padding,
    paddingRight: padding,
    cursor: spec.disabled === true ? "not-allowed" : "pointer",
  };

  if (spec.disabled === true) {
    // A disabled control must not respond to the pointer at all.
    style.opacity = 0.5;
    style.hover = { backgroundColor: rest };
    style.active = { backgroundColor: rest };
  } else {
    style.hover = variant.hover(theme);
    style.active = variant.active(theme);
  }
  if (spec.square === true) {
    style.width = height;
    style.paddingLeft = 0;
    style.paddingRight = 0;
  }
  if (spec.fullWidth === true) style.width = "100%";
  return style;
};

/**
 * What a control adds while it holds keyboard focus.
 *
 * Separate from `controlStyle` because GPUix 0.10.0 has no `focusVisible`
 * pseudo-state: a component tracks focus itself (`onFocus`/`onBlur`) and merges
 * this over the resting style.
 */
export const controlFocusStyle = (
  spec: ControlSpec,
  theme: PrimitiveTheme,
): StyleDesc =>
  ring(spec.invalid === true ? theme.colors.destructive : theme.colors.ring);

// ── Text ─────────────────────────────────────────────────────────────

/** What a run of text means, which decides its colour. */
export const TEXT_TONES = [
  "default",
  "muted",
  "primary",
  "destructive",
  "inherit",
] as const;

export type TextTone = (typeof TEXT_TONES)[number];

const tones: Record<TextTone, Paint> = {
  default: (theme) => theme.colors.foreground,
  muted: (theme) => theme.colors.mutedForeground,
  primary: (theme) => theme.colors.primary,
  destructive: (theme) => theme.colors.destructive,
  /** Take the colour already in effect — for text on a coloured surface. */
  inherit: undefined,
};

/**
 * The colour a tone resolves to, or nothing for `inherit`.
 *
 * Exported so an icon can take the same tone as the text beside it without
 * naming a colour.
 */
export const toneColor = (
  theme: PrimitiveTheme,
  tone: TextTone,
): string | undefined => paint(tones[tone], theme);

export interface TextSpec {
  readonly role: TextRole;
  readonly tone: TextTone;
  readonly align?: "start" | "center" | "end";
  readonly truncate?: boolean;
  /** Maximum visible lines. GPUix clips after this many. */
  readonly clamp?: number;
  /** Selectable text: off by default for chrome, on for content. */
  readonly selectable?: boolean;
}

/** Roles whose family is the monospace face. */
const MONO_ROLES: ReadonlyArray<TextRole> = ["code", "codeBlock"];

export const textStyle = (spec: TextSpec, theme: PrimitiveTheme): StyleDesc => {
  const role = theme.typography[spec.role];
  const style: StyleDesc = {
    fontSize: role.fontSize,
    lineHeight: role.lineHeight,
    fontWeight: role.fontWeight,
    fontFamily: MONO_ROLES.includes(spec.role)
      ? theme.typography.mono
      : theme.typography.sans,
    color: toneColor(theme, spec.tone),
    userSelect: spec.selectable === true ? "text" : "none",
  };
  if (spec.align !== undefined) style.textAlign = spec.align;
  if (spec.truncate === true) {
    style.whiteSpace = "nowrap";
    style.textOverflow = "ellipsis";
  }
  if (spec.clamp !== undefined) {
    style.whiteSpace = "normal";
    style.lineClamp = spec.clamp;
  }
  return style;
};

// ── Surfaces ─────────────────────────────────────────────────────────

export const SURFACE_TONES = [
  "none",
  "background",
  "card",
  "popover",
  "muted",
  "accent",
  "selected",
  "skeleton",
] as const;

export type SurfaceTone = (typeof SURFACE_TONES)[number];

const surfaces: Record<SurfaceTone, Paint> = {
  none: undefined,
  background: (theme) => theme.colors.background,
  card: (theme) => theme.colors.card,
  popover: (theme) => theme.colors.popover,
  muted: (theme) => theme.colors.muted,
  accent: (theme) => theme.colors.accent,
  selected: (theme) => theme.colors.selected,
  skeleton: (theme) => theme.colors.skeleton,
};

export interface SurfaceSpec {
  readonly tone: SurfaceTone;
  /** A step on the theme's spacing scale, or absent for no padding. */
  readonly padding?: SpaceStep;
  readonly radius?: RadiusStep;
  readonly border?: boolean;
  readonly elevation?: ElevationLevel;
}

export const surfaceStyle = (
  spec: SurfaceSpec,
  theme: PrimitiveTheme,
): StyleDesc => {
  const style: StyleDesc = {
    display: "flex",
    flexDirection: "column",
    backgroundColor: paint(surfaces[spec.tone], theme),
  };
  if (spec.padding !== undefined) style.padding = theme.spacing[spec.padding];
  if (spec.radius !== undefined) style.borderRadius = theme.radius[spec.radius];
  if (spec.border === true) {
    style.borderWidth = theme.borderWidth.thin;
    style.borderColor = theme.colors.border;
  }
  if (spec.elevation !== undefined) {
    Option.map(firstShadow(theme.elevation[spec.elevation]), (shadow) => {
      style.boxShadow = shadow;
    });
  }
  return style;
};

// ── Rules, scrollers, progress ───────────────────────────────────────

export interface RuleSpec {
  readonly orientation: "horizontal" | "vertical";
  /** A step on the spacing scale, applied to both ends of the rule. */
  readonly inset?: SpaceStep;
}

/** A separator: one border, on the theme's border colour, never a literal. */
export const ruleStyle = (spec: RuleSpec, theme: PrimitiveTheme): StyleDesc => {
  const inset = spec.inset === undefined ? 0 : theme.spacing[spec.inset];
  return spec.orientation === "horizontal"
    ? {
        height: theme.borderWidth.thin,
        flexShrink: 0,
        backgroundColor: theme.colors.border,
        marginLeft: inset,
        marginRight: inset,
      }
    : {
        width: theme.borderWidth.thin,
        flexShrink: 0,
        backgroundColor: theme.colors.border,
        marginTop: inset,
        marginBottom: inset,
      };
};

export interface ScrollSpec {
  readonly axis: "vertical" | "horizontal" | "both";
}

/**
 * A scrollable container.
 *
 * Only the overflow axes are ours. GPUix 0.10.0 paints the scrollbar with the
 * platform theme and exposes no `scrollbarColor`/`scrollbarWidth` (those are on
 * GPUix's unreleased `main`), so `theme.colors.scrollbar` cannot be applied and
 * there is no fade mask to configure. Both are recorded as limitations in
 * `COMPONENTS.md` rather than faked.
 */
export const scrollStyle = (spec: ScrollSpec): StyleDesc => ({
  overflowY: spec.axis === "horizontal" ? "hidden" : "scroll",
  overflowX: spec.axis === "vertical" ? "hidden" : "scroll",
});

/**
 * Clamp a progress value to the 0–100 the track can actually paint.
 *
 * A value that is not a number at all is treated as empty rather than full: an
 * unknown progress must never look finished. Infinity means "past the end",
 * which is the whole track.
 */
export const progressPercent = (value: number): number =>
  Number.isNaN(value) ? 0 : Math.min(100, Math.max(0, value));

export const PROGRESS_TONES = [
  "primary",
  "success",
  "destructive",
  "muted",
] as const;

export type ProgressTone = (typeof PROGRESS_TONES)[number];

const progressTones: Record<ProgressTone, ColorRef> = {
  primary: (theme) => theme.colors.primary,
  success: (theme) => theme.colors.success,
  destructive: (theme) => theme.colors.destructive,
  muted: (theme) => theme.colors.mutedForeground,
};

export interface ProgressSpec {
  readonly value?: number;
  readonly tone: ProgressTone;
  readonly size: "sm" | "md";
}

const PROGRESS_HEIGHT: Record<ProgressSpec["size"], SpaceStep> = {
  sm: "xs",
  md: "sm",
};

/** The track: full width, one spacing step tall, one step off the surface. */
export const progressTrackStyle = (
  spec: ProgressSpec,
  theme: PrimitiveTheme,
): StyleDesc => ({
  width: "100%",
  height: theme.spacing[PROGRESS_HEIGHT[spec.size]],
  borderRadius: theme.radius.full,
  backgroundColor: theme.colors.muted,
  overflow: "hidden",
});

/** The fill. A value outside 0–100 is clamped, never painted out of the track. */
export const progressFillStyle = (
  spec: ProgressSpec,
  theme: PrimitiveTheme,
): StyleDesc => ({
  height: "100%",
  width: `${progressPercent(spec.value ?? 0)}%`,
  borderRadius: theme.radius.full,
  backgroundColor: paint(progressTones[spec.tone], theme),
});
