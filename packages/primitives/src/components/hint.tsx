/** @jsxImportSource @gpuix/react */
import type { ReactElement } from "react";
import type { StyleDesc } from "@gpuix/react";
import { disabledOpacity } from "@gpuixui/tokens";
import { pipe } from "effect";
import * as Option from "effect/Option";
import { visibleCopy } from "../core/a11y.js";
import { borderWidthOf, colorRole, controlPaddingOf } from "../core/theme.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import { recipeTw } from "../recipe/registry.js";
import { mergeStyle } from "./internal.js";

export type FieldHintAlign = "center" | "top";

export interface FieldHint {
  readonly text: string;
  readonly frame: StyleDesc;
  readonly textStyle: StyleDesc;
}

export interface HintField {
  readonly placeholder?: string;
  readonly disabled?: boolean;
}

export type HintSpec =
  | {
      readonly origin: "field" | "content";
      readonly size: ControlSize;
      readonly align: FieldHintAlign;
    }
  | {
      readonly origin: "host";
      readonly align: FieldHintAlign;
      readonly style?: StyleDesc | undefined;
    };

interface HintInsets {
  readonly border: number;
  readonly paddingLeft: number;
  readonly paddingRight: number;
  readonly paddingTop: number;
}

const pixels = (value: number | undefined): number => value ?? 0;

const hintInsets = (theme: PrimitiveTheme, spec: HintSpec): HintInsets => {
  if (spec.origin === "host") {
    const style = spec.style ?? {};
    return {
      border: pixels(style.borderWidth),
      paddingLeft: pixels(style.paddingLeft),
      paddingRight: pixels(style.paddingRight),
      paddingTop: pixels(style.paddingTop),
    };
  }
  const field = spec.origin === "field";
  const padding = field ? controlPaddingOf(theme, spec.size) : 0;
  return {
    border: field ? borderWidthOf(theme, "thin") : 0,
    paddingLeft: padding,
    paddingRight: padding,
    paddingTop: padding,
  };
};

export const hintFrame = (theme: PrimitiveTheme, spec: HintSpec): StyleDesc => {
  const insets = hintInsets(theme, spec);
  return {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    display: "flex",
    flexDirection: "row",
    alignItems: spec.align === "center" ? "center" : "flex-start",
    paddingLeft: insets.border + insets.paddingLeft,
    paddingRight: insets.paddingRight,
    paddingTop: spec.align === "top" ? insets.border + insets.paddingTop : 0,
    overflow: "hidden",
    pointerEvents: "none",
  };
};

const hintType = (theme: PrimitiveTheme, spec: HintSpec): StyleDesc =>
  spec.origin === "host"
    ? {
        fontSize: spec.style?.fontSize,
        lineHeight: spec.style?.lineHeight,
        fontFamily: spec.style?.fontFamily,
        textAlign: spec.style?.textAlign,
      }
    : recipeTw.classesToStyle("type-body font-sans", theme).style;

export const fieldHint = (
  props: HintField,
  theme: PrimitiveTheme,
  value: string,
  spec: HintSpec,
): Option.Option<FieldHint> =>
  pipe(
    Option.fromNullishOr(visibleCopy(props.placeholder)),
    Option.filter(() => value.length === 0),
    Option.map((text) => ({
      text,
      frame: hintFrame(theme, spec),
      textStyle: mergeStyle(
        mergeStyle(
          recipeTw.classesToStyle("whitespace-nowrap text-ellipsis", theme)
            .style,
          hintType(theme, spec),
        ),
        props.disabled === true
          ? { color: colorRole(theme, "placeholder"), opacity: disabledOpacity }
          : { color: colorRole(theme, "placeholder") },
      ),
    })),
  );

export const renderFieldHint = (
  hint: FieldHint,
  testId: string | undefined,
): ReactElement => (
  <div style={hint.frame}>
    <text
      testId={testId === undefined ? undefined : `${testId}-hint`}
      style={hint.textStyle}
    >
      {hint.text}
    </text>
  </div>
);

export { fieldHelp } from "../core/a11y.js";

export const hintHost = (layout: StyleDesc = {}): StyleDesc => ({
  position: "relative",
  display: "flex",
  ...layout,
});
