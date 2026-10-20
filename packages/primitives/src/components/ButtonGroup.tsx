/**
 * `ButtonGroup` — related actions as one control.
 *
 * `attached` removes the gap so the buttons read as a single segmented control;
 * `separated` keeps the theme's gap. The runtime has no `:first-child`/`:last-child`
 * and a component cannot restyle a child's `borderRadius` without cloning it, so
 * `attached` rounds the **group** and clips it rather than reshaping each button.
 * Pass `square`/`radius` to the buttons when you need the ends alone rounded.
 *
 * The resting appearance is a Tailwind recipe (`recipe/buttonGroupClass`),
 * compiled through `@gpuixui/tw`; the caller's `className` is joined last so it
 * wins conflicts exactly as `cn` resolves them.
 */

import type { ReactElement, ReactNode } from "react";
import type { StyleDesc } from "@gpuix/react";
import { cn } from "@gpuixui/tw";
import type { PrimitiveTheme, SpaceStep } from "../core/theme.js";
import { buttonGroupClass } from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import { mergeStyle } from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

export const BUTTON_GROUP_MODES = ["attached", "separated"] as const;
export type ButtonGroupMode = (typeof BUTTON_GROUP_MODES)[number];

export interface ButtonGroupProps {
  /** Defaults to `attached`. */
  readonly mode?: ButtonGroupMode;
  /** A gap on the theme's spacing scale, for `separated`. Defaults to `sm`. */
  readonly gap?: SpaceStep;
  /**
   * The group's accessible name. The runtime has no `aria-labelledby`, so a
   * visible heading cannot name it by reference; pass the same words here.
   */
  readonly label?: string;
  readonly style?: StyleDesc;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly children?: ReactNode;
  readonly testId?: string;
}

export const renderButtonGroup = (
  {
    mode = "attached",
    gap = "sm",
    label,
    style,
    className,
    children,
    testId,
  }: ButtonGroupProps,
  theme: PrimitiveTheme,
): ReactElement => {
  const resolved = recipeTw.classesToStyle(
    cn(buttonGroupClass(mode, gap), className),
    theme,
  );
  return (
    <div
      role="group"
      aria-label={label}
      testId={testId}
      style={mergeStyle(resolved.style, style)}
    >
      {children}
    </div>
  );
};

/** A row of related buttons. */
export const ButtonGroup = (props: ButtonGroupProps): ReactElement =>
  renderButtonGroup(props, useTheme());
