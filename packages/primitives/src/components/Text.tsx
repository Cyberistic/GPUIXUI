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
  /** Stable locator for automation. */
  readonly testId?: string;
  readonly children?: ReactNode;
}

/** The heading level a role carries, when it is a heading. */
const HEADING_LEVELS: Partial<Record<TextRole, number>> = {
  h1: 1,
  h2: 2,
  h3: 3,
};

/**
 * The host semantics a type role carries.
 *
 * GPUix's `<text>` is a `Label` by default; `role="heading"` + `aria-level` and
 * `role="code"` are mapped by AccessKit (measured: plan `059` §0). Deriving
 * them from the role is what makes `h2` a real heading without a second prop.
 *
 * `display` is deliberately not a heading: it is a visual scale, and the
 * outline level is the page's decision (`h1`).
 */
export const textSemantics = (
  role: TextRole,
): { readonly role?: string; readonly "aria-level"?: number } => {
  const level = HEADING_LEVELS[role];
  if (level !== undefined) return { role: "heading", "aria-level": level };
  return role === "code" || role === "codeBlock" ? { role: "code" } : {};
};

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
    testId,
    children,
  }: TextProps,
  theme: PrimitiveTheme,
): ReactElement => {
  const spec = { role, tone, align, truncate, clamp, selectable };
  return (
    <text
      testId={testId}
      {...textSemantics(role)}
      style={mergeStyle(textStyle(spec, theme), style)}
    >
      {children}
    </text>
  );
};

/** A run of text. */
export const Text = (props: TextProps): ReactElement =>
  renderText(props, useTheme());
