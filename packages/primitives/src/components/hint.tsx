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

/** Where the hint is measured from. */
export interface HintSpec {
  readonly size: ControlSize;
  readonly align: FieldHintAlign;
  /**
   * `field` is a field that draws its own border and padding (`Input`,
   * `TextArea`); `content` is a host already inside that chrome
   * (`NumberField`'s input, which its root insets).
   */
  readonly origin: "field" | "content";
}

/**
 * The frame a hint paints in, over the empty host.
 *
 * The frame sits inside the field and takes no pointer input: a press lands on
 * the host underneath, exactly as it does through the runtime's own hint.
 */
export const hintFrame = (theme: PrimitiveTheme, spec: HintSpec): StyleDesc => {
  const field = spec.origin === "field";
  const padding = field ? theme.density.controlPaddingX[spec.size] : 0;
  const border = field ? theme.borderWidth.thin : 0;
  return {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    display: "flex",
    flexDirection: "row",
    alignItems: spec.align === "center" ? "center" : "flex-start",
    paddingLeft: border + padding,
    paddingRight: padding,
    paddingTop: spec.align === "top" ? border + padding : 0,
    overflow: "hidden",
    pointerEvents: "none",
  };
};

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
        recipeTw.classesToStyle(
          "type-body font-sans whitespace-nowrap text-ellipsis",
          theme,
        ).style,
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
