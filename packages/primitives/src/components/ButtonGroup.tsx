/**
 * `ButtonGroup` — related actions as one control.
 *
 * `attached` removes the gap so the buttons read as a single segmented control;
 * `separated` keeps the theme's gap. The runtime has no `:first-child`/`:last-child`
 * and a component cannot restyle a child's `borderRadius` without cloning it, so
 * `attached` rounds the **group** and clips it rather than reshaping each button.
 * Pass `square`/`radius` to the buttons when you need the ends alone rounded.
 */

import type { ReactElement, ReactNode } from "react";
import type { StyleDesc } from "@gpuix/react";
import type { PrimitiveTheme } from "../core/theme.js";
import { mergeStyle } from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

export const BUTTON_GROUP_MODES = ["attached", "separated"] as const;
export type ButtonGroupMode = (typeof BUTTON_GROUP_MODES)[number];

export interface ButtonGroupProps {
  /** Defaults to `attached`. */
  readonly mode?: ButtonGroupMode;
  /** A gap on the theme's spacing scale, for `separated`. Defaults to `sm`. */
  readonly gap?: keyof PrimitiveTheme["spacing"];
  readonly style?: StyleDesc;
  readonly children?: ReactNode;
  readonly testId?: string;
}

export const renderButtonGroup = (
  { mode = "attached", gap = "sm", style, children, testId }: ButtonGroupProps,
  theme: PrimitiveTheme,
): ReactElement => {
  const base: StyleDesc = {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: mode === "attached" ? 0 : theme.spacing[gap],
  };
  if (mode === "attached") {
    base.borderRadius = theme.radius.md;
    base.overflow = "hidden";
  }
  return (
    <div role="group" testId={testId} style={mergeStyle(base, style)}>
      {children}
    </div>
  );
};

/** A row of related buttons. */
export const ButtonGroup = (props: ButtonGroupProps): ReactElement =>
  renderButtonGroup(props, useTheme());
