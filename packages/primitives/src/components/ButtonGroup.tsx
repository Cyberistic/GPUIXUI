/**
 * `ButtonGroup` — related actions as one control.
 *
 * `attached` removes the gap so the buttons read as a single segmented control;
 * `separated` keeps the theme's gap. `orientation` stacks the actions in a
 * column and shares one width between them, so their ends line up whatever
 * their labels say. The runtime has no `:first-child`/`:last-child`
 * and a ref exposes no style mutation, so `attached` tells the actions it wraps
 * (`AttachedGroup`) that the **group** owns the silhouette: each one squares its
 * own corners and the group's radius plus `overflow: hidden` clip the two ends.
 * Without that, two adjacent rounded fills leave a notch at every seam where the
 * page shows through.
 *
 * The resting appearance is a Tailwind recipe (`recipe/buttonGroupClass`),
 * compiled through `@gpuixui/tw`; the caller's `className` is joined last so it
 * wins conflicts exactly as `cn` resolves them.
 */

import type { ReactElement, ReactNode } from "react";
import type { StyleDesc } from "@gpuix/react";
import { cn } from "@gpuixui/tw";
import { accessibleName } from "../core/a11y.js";
import type { PrimitiveTheme, SpaceStep } from "../core/theme.js";
import { buttonGroupClass } from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import { mergeStyle, AttachedGroup } from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

export const BUTTON_GROUP_MODES = ["attached", "separated"] as const;
export type ButtonGroupMode = (typeof BUTTON_GROUP_MODES)[number];

/** The axis a group lays its actions on. */
export const BUTTON_GROUP_ORIENTATIONS = ["horizontal", "vertical"] as const;
export type ButtonGroupOrientation = (typeof BUTTON_GROUP_ORIENTATIONS)[number];

export interface ButtonGroupProps {
  /** Defaults to `attached`. */
  readonly mode?: ButtonGroupMode;
  /**
   * Defaults to `horizontal`. A vertical group shares one width between its
   * actions, so their ends line up; a square action keeps its own size.
   */
  readonly orientation?: ButtonGroupOrientation;
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
    orientation = "horizontal",
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
    cn(buttonGroupClass(mode, gap, orientation), className),
    theme,
  );
  return (
    <div
      role="group"
      aria-label={accessibleName(label)}
      testId={testId}
      style={mergeStyle(resolved.style, style)}
    >
      <AttachedGroup.Provider value={mode === "attached"}>
        {children}
      </AttachedGroup.Provider>
    </div>
  );
};

/** A row of related buttons. */
export const ButtonGroup = (props: ButtonGroupProps): ReactElement =>
  renderButtonGroup(props, useTheme());
