import type { StyleDesc } from "@gpuix/react";
import type { ControlSize, FilledRole, TextRole, Theme } from "@gpuixui/tokens";
import {
  brandText,
  filledHover,
  filledPressed,
  targetSize,
} from "@gpuixui/tokens";
import { createTw, type TwCompiler } from "@gpuixui/tw";
import { pipe } from "effect";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { switchBox, switchThumbOffset } from "../core/selection.js";
import { pressWash } from "../core/pointer.js";
import { paintableAspectRatio, textAlignValue } from "../core/style.js";
import type { RadiusStep, SpaceStep } from "../core/theme.js";
import {
  borderWidthOf,
  colorRole,
  controlHeightOf,
  controlPaddingOf,
  familyOf,
  iconSideOf,
  radiusValue,
  typeOf,
  spaceValue,
} from "../core/theme.js";

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

const spacingStep = (value: string | undefined): SpaceStep | undefined =>
  value === undefined ? undefined : SPACING_STEP[value];

const controlSize = (value: string | undefined): ControlSize | undefined =>
  value === undefined ? undefined : CONTROL_SIZE[value];

const iconSide = (
  theme: Theme,
  value: string | undefined,
): number | undefined => {
  const size = controlSize(value);
  return size === undefined ? undefined : iconSideOf(theme, size);
};

const halfIconSide = (
  theme: Theme,
  value: string | undefined,
): number | undefined => {
  const side = iconSide(theme, value);
  return side === undefined ? undefined : Math.round(side / 2);
};

const roleType = (
  theme: Theme,
  role: TextRole,
): Pick<StyleDesc, "fontSize" | "lineHeight" | "fontWeight"> => {
  const type = typeOf(theme, role);
  return {
    fontSize: type.fontSize,
    lineHeight: type.lineHeight,
    fontWeight: type.fontWeight,
  };
};

const roleSize = (
  theme: Theme,
  role: TextRole,
): Pick<StyleDesc, "fontSize" | "lineHeight"> => {
  const type = typeOf(theme, role);
  return { fontSize: type.fontSize, lineHeight: type.lineHeight };
};

const CLAMP_TOKEN = /^(.+)-(\d+)$/;

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
        height: typeOf(theme, role).lineHeight * Math.max(1, Number(count)),
      };
};

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

const compiler = createTw({
  utilities: {
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

    "select-text": (theme) => ({
      userSelect: "text",
      selectionColor: colorRole(theme, "selection"),
    }),

    "text-start": () => ({ textAlign: textAlignValue("start") }),
    "text-end": () => ({ textAlign: textAlignValue("end") }),
    "text-ellipsis": () => ({ textOverflow: "ellipsis" }),
    "font-sans": (theme) => ({ fontFamily: familyOf(theme, "sans") }),
    "font-mono": (theme) => ({ fontFamily: familyOf(theme, "mono") }),
    "h-px": (theme) => ({ height: borderWidthOf(theme, "thin") }),
    "w-px": (theme) => ({ width: borderWidthOf(theme, "thin") }),

    "border-dashed": () => ({ borderStyle: "dashed" }),

    "aspect-ratio": (_theme, value) => {
      const ratio = paintableAspectRatio(
        value === undefined ? undefined : Number(value),
      );
      return ratio === undefined ? undefined : { aspectRatio: ratio };
    },
    "shrink-1": () => ({ flexShrink: 1 }),
    "min-w-full": () => ({ minWidth: "100%" }),
    "overflow-x-hidden": () => ({ overflowX: "hidden" }),
    "overflow-x-scroll": () => ({ overflowX: "scroll" }),
    "overflow-y-hidden": () => ({ overflowY: "hidden" }),
    "overflow-y-scroll": () => ({ overflowY: "scroll" }),

    "text-brand": (theme) => ({ color: brandText(theme) }),

    "bg-active": (theme) => ({ backgroundColor: pressWash(theme) }),

    "fill-primary": (theme, value) => filledFill(theme, "primary", value),
    "fill-secondary": (theme, value) => filledFill(theme, "secondary", value),
    "fill-destructive": (theme, value) =>
      filledFill(theme, "destructive", value),

    "fill-accent": (theme, value) => filledFill(theme, "accent", value),
    "ml-0": () => ({ marginLeft: 0 }),
    "mr-0": () => ({ marginRight: 0 }),
    "mt-0": () => ({ marginTop: 0 }),
    "mb-0": () => ({ marginBottom: 0 }),

    gap: (theme, value) => {
      const step = spacingStep(value);
      return step === undefined ? undefined : { gap: spaceValue(theme, step) };
    },
    p: (theme, value) => {
      const step = spacingStep(value);
      return step === undefined
        ? undefined
        : { padding: spaceValue(theme, step) };
    },
    pl: (theme, value) => {
      const step = spacingStep(value);
      return step === undefined
        ? undefined
        : { paddingLeft: spaceValue(theme, step) };
    },
    pr: (theme, value) => {
      const step = spacingStep(value);
      return step === undefined
        ? undefined
        : { paddingRight: spaceValue(theme, step) };
    },
    pt: (theme, value) => {
      const step = spacingStep(value);
      return step === undefined
        ? undefined
        : { paddingTop: spaceValue(theme, step) };
    },
    pb: (theme, value) => {
      const step = spacingStep(value);
      return step === undefined
        ? undefined
        : { paddingBottom: spaceValue(theme, step) };
    },
    ml: (theme, value) => {
      const step = spacingStep(value);
      return step === undefined
        ? undefined
        : { marginLeft: spaceValue(theme, step) };
    },
    mr: (theme, value) => {
      const step = spacingStep(value);
      return step === undefined
        ? undefined
        : { marginRight: spaceValue(theme, step) };
    },
    mt: (theme, value) => {
      const step = spacingStep(value);
      return step === undefined
        ? undefined
        : { marginTop: spaceValue(theme, step) };
    },
    mb: (theme, value) => {
      const step = spacingStep(value);
      return step === undefined
        ? undefined
        : { marginBottom: spaceValue(theme, step) };
    },
    top: (theme, value) => {
      const step = spacingStep(value);
      return step === undefined ? undefined : { top: spaceValue(theme, step) };
    },
    left: (theme, value) => {
      const step = spacingStep(value);
      return step === undefined ? undefined : { left: spaceValue(theme, step) };
    },
    h: (theme, value) => {
      const size = value === undefined ? undefined : CONTROL_SIZE[value];
      return size === undefined
        ? undefined
        : { height: controlHeightOf(theme, size) };
    },
    px: (theme, value) => {
      const size = value === undefined ? undefined : CONTROL_SIZE[value];
      const padding =
        size === undefined ? undefined : controlPaddingOf(theme, size);
      return padding === undefined
        ? undefined
        : { paddingLeft: padding, paddingRight: padding };
    },
    size: (theme, value) => {
      const size = value === undefined ? undefined : CONTROL_SIZE[value];
      const side =
        size === undefined ? undefined : controlHeightOf(theme, size);
      return side === undefined ? undefined : { width: side, height: side };
    },
    rounded: (theme, value) => {
      const step = value === undefined ? undefined : RADIUS_STEP[value];
      return step === undefined
        ? undefined
        : { borderRadius: radiusValue(theme, step) };
    },
    type: (theme, value) => {
      const role = value === undefined ? undefined : TEXT_ROLE[value];
      return role === undefined ? undefined : roleType(theme, role);
    },
    "type-size": (theme, value) => {
      const role = value === undefined ? undefined : TEXT_ROLE[value];
      return role === undefined ? undefined : roleSize(theme, role);
    },

    clamp: clampStyle,

    "size-icon": (theme, value) => iconSide(theme, value),
    "size-dot": (theme, value) => halfIconSide(theme, value),

    "size-thumb": (theme, value) => {
      const size = controlSize(value);
      return size === undefined ? undefined : switchBox(size, theme).knob;
    },
    "switch-track": (theme, value) => {
      const size = controlSize(value);
      if (size === undefined) return undefined;
      const box = switchBox(size, theme);
      return { width: box.width, height: box.height, borderWidth: box.border };
    },
    "switch-thumb": (theme, value) => {
      const size = controlSize(value);
      if (size === undefined) return undefined;
      const box = switchBox(size, theme);
      return {
        top: (box.height - box.border * 2 - box.knob) / 2,
        left: switchThumbOffset(
          { state: "unchecked", size, accent: "primary" },
          theme,
        ),
      };
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
        borderWidth: borderWidthOf(theme, "strong"),
      };
    },

    "slider-thumb-v": (theme, value) => {
      const side = iconSide(theme, value);
      if (side === undefined) return undefined;
      const half = Math.round(side / 2);
      return {
        width: side,
        height: side,
        marginTop: -half,
        marginBottom: -half,
        borderWidth: borderWidthOf(theme, "strong"),
      };
    },
    "px-inset": (theme, value) => {
      const half = halfIconSide(theme, value);
      return half === undefined
        ? undefined
        : { paddingLeft: half, paddingRight: half };
    },
    "py-inset": (theme, value) => {
      const half = halfIconSide(theme, value);
      return half === undefined
        ? undefined
        : { paddingTop: half, paddingBottom: half };
    },

    "w-control": (theme, value) => {
      const size = controlSize(value);
      return size === undefined
        ? undefined
        : { width: controlHeightOf(theme, size) };
    },
    "w-stepper-column": (theme) => ({
      width: iconSideOf(theme, "md") + spaceValue(theme, "sm"),
    }),

    "min-target": () => ({
      minWidth: targetSize.minimum,
      minHeight: targetSize.minimum,
    }),
    "h-space": (theme, value) => {
      const step = spacingStep(value);
      return step === undefined
        ? undefined
        : { height: spaceValue(theme, step) };
    },
    "w-space": (theme, value) => {
      const step = spacingStep(value);
      return step === undefined
        ? undefined
        : { width: spaceValue(theme, step) };
    },
  },
});

export const recipeTw: TwCompiler = {
  ...compiler,
  classesToStyle: (className, theme, state) => {
    const result = compiler.classesToStyle(className, theme, state);
    if (theme.interaction !== "appkit") return result;
    const { hover: _pointer, ...style } = result.style;
    return { ...result, style };
  },
};
