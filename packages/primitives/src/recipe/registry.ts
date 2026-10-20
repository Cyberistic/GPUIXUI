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
import type { ControlSize, TextRole, Theme } from "@gpuixui/tokens";
import { createTw } from "@gpuixui/tw";
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
    "select-text": () => ({ userSelect: "text" }),
    "text-start": () => ({ textAlign: "start" }),
    "text-end": () => ({ textAlign: "end" }),
    "text-ellipsis": () => ({ textOverflow: "ellipsis" }),
    "font-sans": (theme) => ({ fontFamily: theme.typography.sans }),
    "font-mono": (theme) => ({ fontFamily: theme.typography.mono }),

    // Scale-step families → theme values, falling back to the built-in table.
    gap: (theme, value) => {
      const step = value === undefined ? undefined : SPACING_STEP[value];
      return step === undefined ? undefined : { gap: theme.spacing[step] };
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
    "line-clamp": (_theme, value) =>
      value === undefined
        ? undefined
        : { whiteSpace: "normal", lineClamp: Number(value) },
  },
});
