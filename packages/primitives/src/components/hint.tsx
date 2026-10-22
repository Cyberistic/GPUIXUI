/**
 * The hint a text host paints when it is empty.
 *
 * GPUix shapes an empty `<input>`/`<textarea>`'s placeholder in a fixed
 * `#8F8F8F` (`custom_elements/input.rs` at the pinned `@gpuix/native@0.11.0`),
 * so `textFaint` — the role the contrast contract measures on both field fills
 * — never reaches it and no theme can move it. A field therefore gives the host
 * no placeholder and paints the caller's words in the measured `placeholder`
 * role itself.
 *
 * Published because the rule is a runtime fact rather than one field's paint:
 * `@gpuixui/components`' own hinted hosts face the same host behaviour and call
 * this seam instead of keeping a second copy. The frame takes no pointer input,
 * so a press through a hint still focuses the host underneath it.
 *
 * Import it from the `@gpuixui/primitives/hint` subpath, not the package root:
 * the root barrel re-exports every primitive, so a second package reaching the
 * seam through it loads the whole Tier 1 package to paint one line of text.
 */

import type { ReactElement } from "react";
import type { StyleDesc } from "@gpuix/react";
import { disabledOpacity } from "@gpuixui/tokens";
import { pipe } from "effect";
import * as Option from "effect/Option";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import { recipeTw } from "../recipe/registry.js";
import { mergeStyle } from "./internal.js";

/** Which line of a field a hint sits on. */
export type FieldHintAlign = "center" | "top";

/** A field's painted hint. */
export interface FieldHint {
  readonly text: string;
  readonly frame: StyleDesc;
  readonly textStyle: StyleDesc;
}

/** The field a hint belongs to. */
export interface HintField {
  readonly placeholder?: string;
  readonly disabled?: boolean;
}

/**
 * Where the hint is measured from.
 *
 * `field` is a field that draws its own border and padding (`Input`,
 * `TextArea`); `content` is a host already inside that chrome (`NumberField`'s
 * input, which its root insets). `host` is a host another package paints: its
 * resolved style owns the chrome and the type, so the hint follows both.
 */
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

/** The insets a hint frame takes from the box it sits in. */
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
  const padding = field ? theme.density.controlPaddingX[spec.size] : 0;
  return {
    border: field ? theme.borderWidth.thin : 0,
    paddingLeft: padding,
    paddingRight: padding,
    paddingTop: padding,
  };
};

/**
 * The frame a hint paints in, over the empty host.
 *
 * The frame sits inside the field and takes no pointer input: a press lands on
 * the host underneath, exactly as it does through the runtime's own hint.
 */
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

/** The hint's type: the field's body role, or the host's own resolved metrics. */
const hintType = (theme: PrimitiveTheme, spec: HintSpec): StyleDesc =>
  spec.origin === "host"
    ? {
        fontSize: spec.style?.fontSize,
        lineHeight: spec.style?.lineHeight,
        fontFamily: spec.style?.fontFamily,
        textAlign: spec.style?.textAlign,
      }
    : recipeTw.classesToStyle("type-body font-sans", theme).style;

/**
 * A field's hint, or nothing when it has no placeholder or already has a value.
 *
 * A blank placeholder is no hint, and the hint fades with the field's own
 * disabled paint (`disabledOpacity`, the share the field chrome fades by).
 */
export const fieldHint = (
  props: HintField,
  theme: PrimitiveTheme,
  value: string,
  spec: HintSpec,
): Option.Option<FieldHint> =>
  pipe(
    Option.fromNullishOr(props.placeholder),
    Option.filter((text) => text.length > 0 && value.length === 0),
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
          ? { color: theme.colors.placeholder, opacity: disabledOpacity }
          : { color: theme.colors.placeholder },
      ),
    })),
  );

/** The hint element: one label the reader sees and assistive technology reads. */
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

/**
 * The box a hinted host sits in.
 *
 * The frame above is absolutely positioned, so the host needs a positioning
 * context. A host keeps every part of its own chrome — border, fill, radius and
 * the ring the runtime paints on the element it tracks — and this only becomes
 * that context, carrying whatever flex role the host held.
 */
export const hintHost = (layout: StyleDesc = {}): StyleDesc => ({
  position: "relative",
  display: "flex",
  ...layout,
});
