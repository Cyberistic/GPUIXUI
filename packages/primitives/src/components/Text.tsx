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
import {
  textStyle,
  type TextDecoration,
  type TextTone,
} from "../core/style.js";
import type { PrimitiveTheme, TextRole } from "../core/theme.js";
import { ariaName, mergeStyle } from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

export interface TextProps {
  /** A role from the theme's type scale. Defaults to `body`. */
  readonly role?: TextRole;
  /** What the text means, which decides its colour. Defaults to `default`. */
  readonly tone?: TextTone;
  readonly align?: "start" | "center" | "end";
  /** Underline or strike through the run. Omit for no decoration. */
  readonly decoration?: TextDecoration;
  /**
   * Accessible name for a **mark**, not prose — a required asterisk, a status
   * glyph. A named run is exposed as an image with this name (the same shape
   * as `Icon`'s `label`); omit it for text, and a blank name is absent.
   */
  readonly label?: string;
  /** One line, clipped with an ellipsis. */
  readonly truncate?: boolean;
  /** Clip after this many lines. */
  readonly clamp?: number;
  /** Let the user select this text. Off for chrome, on for content. */
  readonly selectable?: boolean;
  /**
   * Whether the run may shrink below its widest word. Defaults to `true`, so a
   * bounded row wraps it; set `false` in a `Grid columnMin="max-content"` cell
   * so the track can measure the run's content (plan `587`).
   */
  readonly shrink?: boolean;
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
 *
 * A **named** run is a mark, not prose: the name wins over the role's own
 * semantics and the run becomes an `Image` (the shape `Icon` uses for a
 * meaningful glyph, plan `581`). A blank name is absent, so the role decides.
 */
export const textSemantics = (
  role: TextRole,
  label?: string,
): {
  readonly role?: string;
  readonly "aria-level"?: number;
  readonly "aria-label"?: string;
} => {
  const named = ariaName(label);
  if (named !== undefined) return { role: "img", "aria-label": named };
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
    decoration,
    label,
    truncate,
    clamp,
    selectable,
    shrink,
    style,
    testId,
    children,
  }: TextProps,
  theme: PrimitiveTheme,
): ReactElement => {
  const spec = {
    role,
    tone,
    align,
    decoration,
    truncate,
    clamp,
    selectable,
    shrink,
  };
  return (
    <text
      testId={testId}
      {...textSemantics(role, label)}
      style={mergeStyle(textStyle(spec, theme), style)}
    >
      {children}
    </text>
  );
};

/** A run of text. */
export const Text = (props: TextProps): ReactElement =>
  renderText(props, useTheme());
