/**
 * `Text` — one run of type.
 *
 * The runtime has a single `text` host element, so every typographic role is
 * the same element with a different resolved `StyleDesc`. `Text` therefore adds
 * no behaviour: it names a role from the theme's type scale and a tone, and the
 * recipe (`recipe/textClass`) decides what that looks like.
 */

import type { ReactElement, ReactNode } from "react";
import type { StyleDesc } from "@gpuix/react";
import { cn } from "@gpuixui/tw";
import type { TextTone } from "../core/style.js";
import type { PrimitiveTheme, TextRole } from "../core/theme.js";
import { textClass } from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import { childrenName, mergeStyle } from "./internal.js";
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
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  /** Stable locator for automation. */
  readonly testId?: string;
  readonly children?: ReactNode;
}

/**
 * The semantics a typographic role carries.
 *
 * A heading role paints type; assistive technology also needs the level, and
 * the runtime exposes `role="heading"` + `aria-level`. Code roles map to
 * AccessKit's `Code`. Body, label, caption and display stay plain text.
 */
const semanticsOf = (
  role: TextRole,
): { readonly role?: string; readonly level?: number } =>
  role === "h1"
    ? { role: "heading", level: 1 }
    : role === "h2"
      ? { role: "heading", level: 2 }
      : role === "h3"
        ? { role: "heading", level: 3 }
        : role === "code" || role === "codeBlock"
          ? { role: "code" }
          : {};

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
    className,
    testId,
    children,
  }: TextProps,
  theme: PrimitiveTheme,
): ReactElement => {
  const resolved = recipeTw.classesToStyle(
    cn(
      textClass({ role, tone, align, truncate, clamp, selectable }),
      className,
    ),
    theme,
  );
  const semantics = semanticsOf(role);
  return (
    <text
      testId={testId}
      role={semantics.role}
      aria-level={semantics.level}
      aria-label={
        semantics.role === undefined ? undefined : childrenName(children)
      }
      style={mergeStyle(resolved.style, style)}
    >
      {children}
    </text>
  );
};

/** A run of text. */
export const Text = (props: TextProps): ReactElement =>
  renderText(props, useTheme());
