/**
 * The hint a text host paints when it is empty.
 *
 * A GPUix `<input>`/`<textarea>` shapes its own placeholder in a fixed
 * `#8F8F8F` (`custom_elements/input.rs` at the pinned `@gpuix/native@0.11.0`),
 * which no theme value reaches: measured 2.84:1 on a white field and 4.72:1 on
 * the base dark fill, while `contrastPairs` holds the `placeholder` role to the
 * secondary floor on **both** fills (`nativeTextFills`). So a host in this
 * package is handed no `placeholder`; the field paints the hint itself in the
 * measured role.
 *
 * The hint derives its geometry and type from the host's own compiled style, so
 * a recipe change moves the hint with it, and the frame takes no pointer input
 * so a press through the hint still focuses the host.
 *
 * `@gpuixui/primitives`' fields paint the same hint from their own seam; the two
 * cannot share it until that seam is published (`TODO.md` → Interlocks).
 */

import type { StyleDesc } from "@gpuix/react";
import { pipe } from "effect";
import * as Option from "effect/Option";
import type { ReactElement } from "react";
import type { Theme } from "./theme.js";

/** Where the hint sits in its host's box. */
export type HintAlign = "center" | "top";

/** What the hint reads off the host it belongs to. */
export interface HintSpec {
  /** The host's resolved resting style: its padding, border and type scale. */
  readonly style: StyleDesc | undefined;
  /** `center` for a single line, `top` for the first row of a textarea. */
  readonly align: HintAlign;
  /** The host refuses edits, so the hint takes the disabled label role. */
  readonly disabled?: boolean;
}

/** A hint ready to paint. */
export interface TextHint {
  readonly text: string;
  readonly frame: StyleDesc;
  readonly textStyle: StyleDesc;
}

const pixels = (value: number | undefined): number => value ?? 0;

/** The frame a hint paints in: over the host, with the host's own insets. */
export const hintFrame = ({ style = {}, align }: HintSpec): StyleDesc => {
  const border = pixels(style.borderWidth);
  return {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    display: "flex",
    flexDirection: "column",
    justifyContent: align === "center" ? "center" : "flex-start",
    alignItems: "stretch",
    paddingLeft: border + pixels(style.paddingLeft),
    paddingRight: border + pixels(style.paddingRight),
    paddingTop: align === "top" ? border + pixels(style.paddingTop) : 0,
    overflow: "hidden",
    pointerEvents: "none",
  };
};

/**
 * The hint an empty host paints — or nothing when it has no placeholder, the
 * placeholder is blank, or the reader has typed something.
 */
export const textHint = (
  theme: Theme,
  spec: HintSpec,
  placeholder: string | undefined,
  value: string,
): Option.Option<TextHint> => {
  const style = spec.style ?? {};
  return pipe(
    Option.fromNullishOr(placeholder),
    Option.filter((text) => text.length > 0 && value.length === 0),
    Option.map((text) => ({
      text,
      frame: hintFrame(spec),
      textStyle: {
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        fontFamily: style.fontFamily,
        textAlign: style.textAlign,
        color:
          spec.disabled === true
            ? theme.colors.disabledForeground
            : theme.colors.placeholder,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      },
    })),
  );
};

/** The hint element, named beside the host it belongs to. */
export const renderHint = (
  hint: TextHint,
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
 * The host keeps every part of its own chrome — border, fill, radius and the
 * focus ring the runtime paints on the element it tracks — so this frame only
 * becomes the positioning context the hint needs. `layout` carries whatever
 * flex role the host held before it was wrapped.
 */
export const hintHost = (layout: StyleDesc = {}): StyleDesc => ({
  position: "relative",
  display: "flex",
  ...layout,
});
