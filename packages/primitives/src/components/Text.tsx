/**
 * `Text` — one run of type.
 *
 * The runtime has a single `text` host element, so every typographic role is
 * the same element with a different resolved `StyleDesc`. `Text` therefore adds
 * no behaviour: it names a role from the theme's type scale and a tone, and
 * `core/style.ts` decides what that looks like.
 */

import type { ReactElement, ReactNode } from "react";
import type { StyleDesc } from "@gpuix/react";
import { textStyle, type TextTone } from "../core/style.js";
import type { PrimitiveTheme, TextRole } from "../core/theme.js";
import { mergeStyle } from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

export interface TextProps {
  /** A role from the theme's type scale. Defaults to `body`. */
  readonly role?: TextRole;
  /** What the text means, which decides its colour. Defaults to `default`. */
  readonly tone?: TextTone;
  readonly align?: "start" | "center" | "end";
  /** One line, clipped with an ellipsis. */
  readonly truncate?: boolean;
  /** Clip after this many lines. */
  readonly clamp?: number;
  /** Let the user select this text. Off for chrome, on for content. */
  readonly selectable?: boolean;
  readonly style?: StyleDesc;
  readonly children?: ReactNode;
}

/** The element `Text` renders. Pure, so it is testable without a runtime. */
export const renderText = (
  {
    role = "body",
    tone = "default",
    align,
    truncate,
    clamp,
    selectable,
    style,
    children,
  }: TextProps,
  theme: PrimitiveTheme,
): ReactElement => {
  const spec = { role, tone, align, truncate, clamp, selectable };
  return (
    <text style={mergeStyle(textStyle(spec, theme), style)}>{children}</text>
  );
};

/** A run of text. */
export const Text = (props: TextProps): ReactElement =>
  renderText(props, useTheme());
