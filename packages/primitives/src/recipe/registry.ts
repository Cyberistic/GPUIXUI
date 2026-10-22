/**
 * The primitives' Tailwind registry.
 *
 * `@gpuixui/tw` compiles shadcn's fixed metric values (`h-9` → 36, `px-4` →
 * 16). The primitives' geometry is theme-scale driven — control height and
 * padding come from the active density, gap from the spacing scale, type from
 * the typography scale — so this registry maps the named scale steps the
 * primitives use to those theme values and falls back to the built-in table for
 * every other class. The compiled `StyleDesc` is therefore identical to what
 * `core/style.ts` resolves, while a component's recipe stays a Tailwind class
 * string.
 */

import type { StyleDesc } from "@gpuix/react";
import type { ControlSize, FilledRole, TextRole, Theme } from "@gpuixui/tokens";
import {
  brandText,
  filledHover,
  filledPressed,
  targetSize,
} from "@gpuixui/tokens";
import { createTw } from "@gpuixui/tw";
import { pipe } from "effect";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { switchThumbOffset } from "../core/selection.js";
import type { RadiusStep, SpaceStep } from "../core/theme.js";

/** A class-string step name → the theme key it resolves to. */
const SPACING_STEP: Readonly<Partial<Record<string, SpaceStep>>> = {
  "2xs": "2xs",
  xs: "xs",
  sm: "sm",
  md: "md",
  lg: "lg",
  xl: "xl",
  "2xl": "2xl",
  "3xl": "3xl",
  "4xl": "4xl",
  "5xl": "5xl",
};

const RADIUS_STEP: Readonly<Partial<Record<string, RadiusStep>>> = {
  none: "none",
  sm: "sm",
  md: "md",
  lg: "lg",
  xl: "xl",
  full: "full",
};

const CONTROL_SIZE: Readonly<Partial<Record<string, ControlSize>>> = {
  sm: "sm",
  md: "md",
  lg: "lg",
};

const TEXT_ROLE: Readonly<Partial<Record<string, TextRole>>> = {
  display: "display",
  h1: "h1",
  h2: "h2",
  h3: "h3",
  body: "body",
  "body-strong": "bodyStrong",
  label: "label",
  caption: "caption",
  code: "code",
  "code-block": "codeBlock",
};

/** A spacing step by its class-string name, or nothing for a non-step value. */
const spacingStep = (value: string | undefined): SpaceStep | undefined =>
  value === undefined ? undefined : SPACING_STEP[value];

/** A control size by its class-string name, or nothing for a non-size value. */
const controlSize = (value: string | undefined): ControlSize | undefined =>
  value === undefined ? undefined : CONTROL_SIZE[value];

/** The square icon side for a control size: `theme.iconSize[size]`. */
const iconSide = (
  theme: Theme,
  value: string | undefined,
): number | undefined => {
  const size = controlSize(value);
  return size === undefined ? undefined : theme.iconSize[size];
};

/** Half the icon side, rounded: `round(iconSize[size] / 2)`. */
const halfIconSide = (
  theme: Theme,
  value: string | undefined,
): number | undefined => {
  const side = iconSide(theme, value);
  return side === undefined ? undefined : Math.round(side / 2);
};

/** The three typographic numbers a role resolves to (family is separate). */
const roleType = (
  theme: Theme,
  role: TextRole,
): Pick<StyleDesc, "fontSize" | "lineHeight" | "fontWeight"> => {
  const type = theme.typography[role];
  return {
    fontSize: type.fontSize,
    lineHeight: type.lineHeight,
    fontWeight: type.fontWeight,
  };
};

/** A role's size and leading only, for text that inherits the surrounding weight. */
const roleSize = (
  theme: Theme,
  role: TextRole,
): Pick<StyleDesc, "fontSize" | "lineHeight"> => {
  const type = theme.typography[role];
  return { fontSize: type.fontSize, lineHeight: type.lineHeight };
};

/** The shape of a `clamp-<role>-<lines>` class. */
const CLAMP_TOKEN = /^(.+)-(\d+)$/;

/**
 * The box a clamped run paints: its role's leading times the line count.
 *
 * A clamp is not a style the runtime paints — `lineClamp` cuts nothing in
 * 0.11.0 — so the height is definite and the overflow hidden, which is the
 * composition the `text-truncation` probe measured painting the requested
 * lines. An unknown role or a count that is not a number resolves to nothing,
 * so a typo lands in the compiler's `unsupported` list instead of painting an
 * uncut paragraph.
 */
const clampStyle = (
  theme: Theme,
  value: string | undefined,
): StyleDesc | undefined => {
  const token = pipe(
    Option.fromNullishOr(value),
    Option.flatMap(Str.match(CLAMP_TOKEN)),
  );
  if (Option.isNone(token)) return undefined;
  const [, key = "", count = "0"] = token.value;
  const role = TEXT_ROLE[key];
  return role === undefined
    ? undefined
    : {
        whiteSpace: "normal",
        overflow: "hidden",
        height: theme.typography[role].lineHeight * Math.max(1, Number(count)),
      };
};

/**
 * A filled action's hover and press fill, as a derived colour.
 *
 * The fill moves toward the theme's foreground and stays **opaque**: a
 * half-alpha lift (`bg-primary/90`) let the surface behind the control
 * through, so the same action read as two colours on a card and on a dialog,
 * and its label could not be measured for contrast at all.
 *
 * The class name carries the state — `fill-primary` is the hover,
 * `fill-primary-pressed` the press — and an unknown suffix resolves to
 * nothing, so a typo lands in the compiler's `unsupported` list instead of
 * painting the resting fill.
 */
const filledFill = (
  theme: Theme,
  role: FilledRole,
  value: string | undefined,
): StyleDesc | undefined =>
  value === undefined
    ? { backgroundColor: filledHover(theme, role) }
    : value === "pressed"
      ? { backgroundColor: filledPressed(theme, role) }
      : undefined;

/** The primitives' compiler: built-in utilities plus the theme-scale steps. */
export const recipeTw = createTw({
  utilities: {
    // Geometry and text chrome the built-in table lacks.
    "flex-row": () => ({ flexDirection: "row" }),
    "justify-start": () => ({ justifyContent: "flex-start" }),
    "justify-end": () => ({ justifyContent: "flex-end" }),
    "justify-around": () => ({ justifyContent: "space-around" }),
    "items-end": () => ({ alignItems: "flex-end" }),
    "items-stretch": () => ({ alignItems: "stretch" }),
    "items-baseline": () => ({ alignItems: "baseline" }),
    "flex-wrap": () => ({ flexWrap: "wrap" }),
    "flex-grow": () => ({ flexGrow: 1 }),
    "cursor-text": () => ({ cursor: "text" }),
    // A selectable run paints the design system's own wash. GPUix defaults to
    // the theme accent at 35%, a colour no contrast pair measures; `selection`
    // is composited and held to both floors by `@gpuixui/tokens`.
    "select-text": (theme) => ({
      userSelect: "text",
      selectionColor: theme.colors.selection,
    }),
    "text-start": () => ({ textAlign: "start" }),
    "text-end": () => ({ textAlign: "end" }),
    "text-ellipsis": () => ({ textOverflow: "ellipsis" }),
    "font-sans": (theme) => ({ fontFamily: theme.typography.sans }),
    "font-mono": (theme) => ({ fontFamily: theme.typography.mono }),
    "h-px": (theme) => ({ height: theme.borderWidth.thin }),
    "w-px": (theme) => ({ width: theme.borderWidth.thin }),
    "shrink-1": () => ({ flexShrink: 1 }),
    "min-w-full": () => ({ minWidth: "100%" }),
    "overflow-x-hidden": () => ({ overflowX: "hidden" }),
    "overflow-x-scroll": () => ({ overflowX: "scroll" }),
    "overflow-y-hidden": () => ({ overflowY: "hidden" }),
    "overflow-y-scroll": () => ({ overflowY: "scroll" }),
    // `border-input` is deliberately not overridden: `input` is a field *fill*
    // in this system, and an edge takes `border` or the measured `border-strong`.
    // Brand-coloured text is derived, not named: `primary` is a fill role, so
    // `text-primary` paints a link at 4.30:1 on the base light theme's pressed
    // wash and 3.10:1 in macOS dark. `brandText` moves the brand toward
    // `foreground` until the least readable surface a link sits on clears.
    "text-brand": (theme) => ({ color: brandText(theme) }),
    // A filled action's feedback is derived too: the hover and the press are
    // opaque fills the theme owns, not a half-alpha lift of the resting one.
    "fill-primary": (theme, value) => filledFill(theme, "primary", value),
    "fill-secondary": (theme, value) => filledFill(theme, "secondary", value),
    "fill-destructive": (theme, value) =>
      filledFill(theme, "destructive", value),
    // A pressed toggle's face is the accent role rather than one of the three
    // actions, and the tokens' `FilledRole` owns that fourth face.
    "fill-accent": (theme, value) => filledFill(theme, "accent", value),
    "ml-0": () => ({ marginLeft: 0 }),
    "mr-0": () => ({ marginRight: 0 }),
    "mt-0": () => ({ marginTop: 0 }),
    "mb-0": () => ({ marginBottom: 0 }),

    // Scale-step families → theme values, falling back to the built-in table.
    gap: (theme, value) => {
      const step = spacingStep(value);
      return step === undefined ? undefined : { gap: theme.spacing[step] };
    },
    p: (theme, value) => {
      const step = spacingStep(value);
      return step === undefined ? undefined : { padding: theme.spacing[step] };
    },
    pl: (theme, value) => {
      const step = spacingStep(value);
      return step === undefined
        ? undefined
        : { paddingLeft: theme.spacing[step] };
    },
    pr: (theme, value) => {
      const step = spacingStep(value);
      return step === undefined
        ? undefined
        : { paddingRight: theme.spacing[step] };
    },
    pt: (theme, value) => {
      const step = spacingStep(value);
      return step === undefined
        ? undefined
        : { paddingTop: theme.spacing[step] };
    },
    pb: (theme, value) => {
      const step = spacingStep(value);
      return step === undefined
        ? undefined
        : { paddingBottom: theme.spacing[step] };
    },
    ml: (theme, value) => {
      const step = spacingStep(value);
      return step === undefined
        ? undefined
        : { marginLeft: theme.spacing[step] };
    },
    mr: (theme, value) => {
      const step = spacingStep(value);
      return step === undefined
        ? undefined
        : { marginRight: theme.spacing[step] };
    },
    mt: (theme, value) => {
      const step = spacingStep(value);
      return step === undefined
        ? undefined
        : { marginTop: theme.spacing[step] };
    },
    mb: (theme, value) => {
      const step = spacingStep(value);
      return step === undefined
        ? undefined
        : { marginBottom: theme.spacing[step] };
    },
    top: (theme, value) => {
      const step = spacingStep(value);
      return step === undefined ? undefined : { top: theme.spacing[step] };
    },
    left: (theme, value) => {
      const step = spacingStep(value);
      return step === undefined ? undefined : { left: theme.spacing[step] };
    },
    h: (theme, value) => {
      const size = value === undefined ? undefined : CONTROL_SIZE[value];
      return size === undefined
        ? undefined
        : { height: theme.density.controlHeight[size] };
    },
    px: (theme, value) => {
      const size = value === undefined ? undefined : CONTROL_SIZE[value];
      const padding =
        size === undefined ? undefined : theme.density.controlPaddingX[size];
      return padding === undefined
        ? undefined
        : { paddingLeft: padding, paddingRight: padding };
    },
    size: (theme, value) => {
      const size = value === undefined ? undefined : CONTROL_SIZE[value];
      const side =
        size === undefined ? undefined : theme.density.controlHeight[size];
      return side === undefined ? undefined : { width: side, height: side };
    },
    rounded: (theme, value) => {
      const step = value === undefined ? undefined : RADIUS_STEP[value];
      return step === undefined
        ? undefined
        : { borderRadius: theme.radius[step] };
    },
    type: (theme, value) => {
      const role = value === undefined ? undefined : TEXT_ROLE[value];
      return role === undefined ? undefined : roleType(theme, role);
    },
    "type-size": (theme, value) => {
      const role = value === undefined ? undefined : TEXT_ROLE[value];
      return role === undefined ? undefined : roleSize(theme, role);
    },
    // A clamped run's box: the line count times the role's own leading, with a
    // hidden overflow. `lineClamp` is declared by 0.11.0 and paints every line
    // (measured by the playground's `text-truncation` probe), so the cut has to
    // be a definite box. The role is in the class name for that reason.
    clamp: clampStyle,

    // Derived geometry: a number resolves to a square (`width` + `height`);
    // a non-square value returns the shape it means. All read the theme's
    // iconSize / spacing scales, so they follow a density or icon-size
    // override exactly as the pre-migration `core/` resolvers did.
    "size-icon": (theme, value) => iconSide(theme, value),
    "size-dot": (theme, value) => halfIconSide(theme, value),
    "size-thumb": (theme, value) => {
      const side = iconSide(theme, value);
      return side === undefined ? undefined : side - 2 * theme.spacing["2xs"];
    },
    "switch-track": (theme, value) => {
      const side = iconSide(theme, value);
      return side === undefined
        ? undefined
        : { width: Math.round(side * 1.75), height: side };
    },
    "switch-thumb-on": (theme, value) => {
      const size = controlSize(value);
      return size === undefined
        ? undefined
        : {
            left: switchThumbOffset(
              { state: "checked", size, accent: "primary" },
              theme,
            ),
          };
    },
    "slider-thumb": (theme, value) => {
      const side = iconSide(theme, value);
      if (side === undefined) return undefined;
      const half = Math.round(side / 2);
      return {
        width: side,
        height: side,
        marginLeft: -half,
        marginRight: -half,
        borderWidth: theme.borderWidth.strong,
      };
    },
    "px-inset": (theme, value) => {
      const half = halfIconSide(theme, value);
      return half === undefined
        ? undefined
        : { paddingLeft: half, paddingRight: half };
    },
    "w-stepper-column": (theme) => ({
      width: theme.iconSize.md + theme.spacing.sm,
    }),
    // The pressable-target floor (WCAG 2.2 SC 2.5.8) a drawn control sits in.
    // A fixed minimum, like `targetSize` itself — not a theme group.
    "min-target": () => ({
      minWidth: targetSize.minimum,
      minHeight: targetSize.minimum,
    }),
    "h-space": (theme, value) => {
      const step = spacingStep(value);
      return step === undefined ? undefined : { height: theme.spacing[step] };
    },
  },
});
