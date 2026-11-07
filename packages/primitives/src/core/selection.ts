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
  switchMetricsAt,
  targetInset,
  targetSize,
} from "@gpuixui/tokens";
import type { SwitchColors } from "@gpuixui/tokens";
import {
  iconSideOf,
  borderWidthOf,
  colorRole,
  radiusValue,
  spaceValue,
} from "./theme.js";
import type { ControlSize, PrimitiveTheme } from "./theme.js";
import { pressWash } from "./pointer.js";

type SwitchSlot = "on" | "off" | "knob" | "knobOff" | "edge";

const DeclaredSwitch = Schema.Record(Schema.String, Schema.Unknown);
type DeclaredSwitch = typeof DeclaredSwitch.Type;

const decodeDeclaredSwitch = Schema.decodeUnknownOption(DeclaredSwitch);

export type SwitchPaintTheme = Omit<PrimitiveTheme, "switch"> & {
  readonly switch?: unknown;
};

const declaredPaint = (source: SwitchPaintTheme): Option.Option<SwitchColors> =>
  Option.flatMap(Option.fromNullishOr(source.switch), (table) =>
    Option.flatMap(decodeDeclaredSwitch(table), (paint) =>
      Option.map(
        Option.all({
          on: declaredColour(paint, "on"),
          off: declaredColour(paint, "off"),
          knob: declaredColour(paint, "knob"),
        }),
        (slots) => {
          const edge = Option.getOrUndefined(declaredColour(paint, "edge"));
          const knobOff = Option.getOrUndefined(
            declaredColour(paint, "knobOff"),
          );
          return {
            ...slots,
            ...(edge === undefined ? {} : { edge }),
            ...(knobOff === undefined ? {} : { knobOff }),
          };
        },
      ),
    ),
  );

const switchTheme = (source: SwitchPaintTheme): PrimitiveTheme => ({
  ...source,
  switch: Option.getOrUndefined(declaredPaint(source)),
});

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

export const SELECTION_ACCENTS = ["primary", "destructive"] as const;
export type SelectionAccent = (typeof SELECTION_ACCENTS)[number];

const ACCENT_NAMES: ReadonlyArray<string> = SELECTION_ACCENTS;

export const isSelectionAccent = (value: unknown): value is SelectionAccent =>
  typeof value === "string" && Arr.contains(ACCENT_NAMES, value);

export const selectionAccentOf = (value: unknown): SelectionAccent =>
  isSelectionAccent(value) ? value : "primary";

export interface SelectionSpec {
  readonly state: SelectionState;
  readonly size: ControlSize;
  readonly accent: SelectionAccent;

  readonly shape?: "square" | "circle";
  readonly invalid?: boolean;
  readonly disabled?: boolean;
}

const filled = (spec: SelectionSpec): boolean => spec.state !== "unchecked";

const accentRole = (
  spec: SelectionSpec,
  theme: PrimitiveTheme,
): {
  readonly background: string | undefined;
  readonly foreground: string | undefined;
} =>
  spec.accent === "destructive"
    ? {
        background: colorRole(theme, "destructive"),
        foreground: colorRole(theme, "destructiveForeground"),
      }
    : {
        background: colorRole(theme, "primary"),
        foreground: colorRole(theme, "primaryForeground"),
      };

export const selectionMarkColor = (
  spec: SelectionSpec,
  theme: PrimitiveTheme,
): string | undefined =>
  filled(spec)
    ? accentRole(spec, theme).foreground
    : spec.invalid === true
      ? colorRole(theme, "destructive")
      : colorRole(theme, "mutedForeground");

const feedbackFill = (
  spec: SelectionSpec,
  theme: PrimitiveTheme,
  phase: "hover" | "press",
): StyleDesc => ({
  backgroundColor:
    phase === "hover"
      ? filledHover(theme, selectionAccentOf(spec.accent))
      : filledPressed(theme, selectionAccentOf(spec.accent)),
  borderColor: "transparent",
});

export const selectionBoxStyle = (
  spec: SelectionSpec,
  theme: PrimitiveTheme,
): StyleDesc => {
  const side = iconSideOf(theme, spec.size);
  const role = accentRole(spec, theme);
  const emptyBorder =
    spec.invalid === true
      ? colorRole(theme, "destructive")
      : colorRole(theme, "borderStrong");
  const style: StyleDesc = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: side,
    height: side,
    flexShrink: 0,
    borderRadius:
      spec.shape === "circle"
        ? radiusValue(theme, "full")
        : radiusValue(theme, "sm"),
    borderWidth: borderWidthOf(theme, "thin"),
    borderColor: filled(spec) ? role.background : emptyBorder,
    backgroundColor: filled(spec) ? role.background : undefined,
    color: selectionMarkColor(spec, theme),
    cursor: spec.disabled === true ? "not-allowed" : "pointer",
    hover: filled(spec)
      ? feedbackFill(spec, theme, "hover")
      : { backgroundColor: colorRole(theme, "hover") },
    active: filled(spec)
      ? feedbackFill(spec, theme, "press")
      : { backgroundColor: pressWash(theme) },
  };
  if (spec.disabled === true) {
    style.opacity = disabledOpacity;

    style.hover = {
      backgroundColor: filled(spec) ? role.background : undefined,
      borderColor: filled(spec) ? role.background : emptyBorder,
    };
    style.active = {};
  }
  return style;
};

export const switchThumbInset = (
  spec: SelectionSpec,
  source: SwitchPaintTheme,
): number => switchBox(spec.size, source).inset;

export interface SwitchBox {
  readonly width: number;

  readonly height: number;

  readonly knob: number;

  readonly inset: number;

  readonly border: number;
}

export const switchBox = (
  size: ControlSize,
  source: SwitchPaintTheme,
): SwitchBox => {
  const theme = switchTheme(source);

  const metrics = Option.getOrUndefined(
    Option.fromNullishOr(theme.switchMetrics),
  );
  if (theme.switch !== undefined && metrics !== undefined) {
    return switchMetricsAt(metrics, size);
  }
  const iconSide = iconSideOf(theme, size);
  const inset = spaceValue(theme, "2xs");
  return {
    width: Math.round(iconSide * 1.75),
    height: iconSide,
    knob: iconSide - inset * 2,
    inset,
    border: borderWidthOf(theme, "thin"),
  };
};

export const selectionTargetStyle = (
  spec: SelectionSpec,
  theme: PrimitiveTheme,
): StyleDesc => {
  const side = iconSideOf(theme, spec.size);
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

export const switchTargetStyle = (spec: SelectionSpec): StyleDesc => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: targetSize.minimum,
  flexShrink: 0,
  cursor: spec.disabled === true ? "not-allowed" : "pointer",
});

export const switchThumbTravel = (
  spec: SelectionSpec,
  theme: SwitchPaintTheme,
): number => {
  const box = switchBox(spec.size, theme);
  return box.width - box.knob - box.inset * 2;
};

export const switchThumbOffset = (
  spec: SelectionSpec,
  theme: SwitchPaintTheme,
): number => {
  const box = switchBox(spec.size, theme);
  const rest = box.inset - box.border;
  return rest + (filled(spec) ? switchThumbTravel(spec, theme) : 0);
};

const switchFill = (
  spec: SelectionSpec,
  theme: PrimitiveTheme,
): string | undefined =>
  theme.switch === undefined
    ? undefined
    : filled(spec)
      ? theme.switch.on
      : spec.invalid === true
        ? colorRole(theme, "destructive")
        : theme.switch.off;

export const switchTrackPaint = (
  spec: SelectionSpec,
  source: SwitchPaintTheme,
): StyleDesc | undefined => {
  const theme = switchTheme(source);
  const fill = switchFill(spec, theme);
  if (fill === undefined) return undefined;
  const edge = filled(spec)
    ? fill
    : spec.invalid === true
      ? colorRole(theme, "destructive")
      : (theme.switch?.edge ?? fill);
  const box = switchBox(spec.size, source);
  return {
    backgroundColor: fill,
    borderColor: edge,

    boxShadow:
      !filled(spec) && box.border === 0 && theme.switch?.edge !== undefined
        ? {
            offsetX: 0,
            offsetY: 0,
            blurRadius: 0,
            spreadRadius: 1,
            color: edge ?? fill,
          }
        : undefined,
    hover: { backgroundColor: fill, borderColor: edge },
    active: { backgroundColor: fill, borderColor: edge },
  };
};

export const switchThumbPaint = (
  spec: SelectionSpec,
  source: SwitchPaintTheme,
): StyleDesc | undefined => {
  const theme = switchTheme(source);
  return theme.switch === undefined
    ? undefined
    : {
        backgroundColor: filled(spec)
          ? theme.switch.knob
          : (theme.switch.knobOff ?? theme.switch.knob),
        boxShadow: elevationShadow(theme, "sm"),
      };
};

export const switchTrackStyle = (
  spec: SelectionSpec,
  source: SwitchPaintTheme,
): StyleDesc => {
  const theme = switchTheme(source);
  const box = switchBox(spec.size, source);
  const role = accentRole(spec, theme);
  const emptyBorder =
    spec.invalid === true
      ? colorRole(theme, "destructive")
      : colorRole(theme, "borderStrong");
  const paint = switchTrackPaint(spec, source);
  const fill =
    paint?.backgroundColor ??
    (filled(spec) ? role.background : colorRole(theme, "muted"));
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
    borderRadius: radiusValue(theme, "full"),
    borderWidth: box.border,
    borderColor: edge,
    backgroundColor: fill,
    boxShadow: paint?.boxShadow,
    cursor: spec.disabled === true ? "not-allowed" : "pointer",
    hover:
      paint?.hover ??
      (filled(spec)
        ? feedbackFill(spec, theme, "hover")
        : { backgroundColor: colorRole(theme, "hover") }),
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

export const switchThumbStyle = (
  spec: SelectionSpec,
  source: SwitchPaintTheme,
): StyleDesc => {
  const theme = switchTheme(source);
  const paint = switchThumbPaint(spec, source);
  const box = switchBox(spec.size, source);
  return {
    position: "absolute",

    top: (box.height - box.border * 2 - box.knob) / 2,
    left: switchThumbOffset(spec, source),
    width: box.knob,
    height: box.knob,
    flexShrink: 0,
    borderRadius: radiusValue(theme, "full"),
    pointerEvents: "none",
    backgroundColor:
      paint?.backgroundColor ??
      (filled(spec)
        ? accentRole(spec, theme).foreground
        : colorRole(theme, "foreground")),
    boxShadow: paint?.boxShadow,
  };
};

export const radioDotStyle = (
  spec: SelectionSpec,
  theme: PrimitiveTheme,
): StyleDesc => {
  const side = Math.round(iconSideOf(theme, spec.size) / 2);
  return {
    width: side,
    height: side,
    flexShrink: 0,
    borderRadius: radiusValue(theme, "full"),
    backgroundColor: selectionMarkColor(spec, theme),
  };
};

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
