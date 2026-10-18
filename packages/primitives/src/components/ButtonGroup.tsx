/**
 * `ButtonGroup` — related actions as one control.
 *
 * `attached` removes the gap so the buttons read as a single segmented control;
 * `separated` keeps the theme's gap. The runtime has no `:first-child`/`:last-child`
 * and a component cannot restyle a child's `borderRadius` without cloning it, so
 * `attached` asks every `Button` to be square (through `GroupShapeContext`) and
 * rounds and clips the **group** instead. The clip supplies the outer corners,
 * so no shared edge has a double-rounded notch (measured: plan `078`). A
 * button's explicit `radius` still wins. The axis is `orientation`: a vertical
 * group stacks its buttons and stretches them to the group's width (plan `096`).
 * The clip would also cut away a focused button's outer ring, so a button in an
 * attached group paints its ring as an inset overlay (plan `344`).
 */

import type { ReactElement, ReactNode } from "react";
import type { StyleDesc } from "@gpuix/react";
import * as Option from "effect/Option";
import type { PrimitiveTheme } from "../core/theme.js";
import { GroupShapeContext } from "./group-shape.js";
import { mergeStyle } from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

/** The button groups' two layouts: joined into one control, or spaced apart. */
export const BUTTON_GROUP_MODES = ["attached", "separated"] as const;
export type ButtonGroupMode = (typeof BUTTON_GROUP_MODES)[number];

/** The axes a button group can lay its buttons out on. */
export const BUTTON_GROUP_AXES = ["horizontal", "vertical"] as const;
export type ButtonGroupOrientation = (typeof BUTTON_GROUP_AXES)[number];

export interface ButtonGroupProps {
  /** Defaults to `attached`. */
  readonly mode?: ButtonGroupMode;
  /**
   * Defaults to `horizontal`. A vertical group stacks its buttons and stretches
   * each to the group's width, so a column of actions does not look ragged.
   */
  readonly orientation?: ButtonGroupOrientation;
  /** A gap on the theme's spacing scale, for `separated`. Defaults to `sm`. */
  readonly gap?: keyof PrimitiveTheme["spacing"];
  /**
   * The group's accessible name. The runtime has no `aria-labelledby`, so a
   * visible heading cannot name it by reference; pass the same words here.
   */
  readonly label?: string;
  readonly style?: StyleDesc;
  readonly children?: ReactNode;
  readonly testId?: string;
}

/** The element tree `ButtonGroup` renders, including the shared radius it supplies. */
export const renderButtonGroup = (
  {
    mode = "attached",
    orientation = "horizontal",
    gap = "sm",
    label,
    style,
    children,
    testId,
  }: ButtonGroupProps,
  theme: PrimitiveTheme,
): ReactElement => {
  const vertical = orientation === "vertical";
  const base: StyleDesc = {
    display: "flex",
    flexDirection: vertical ? "column" : "row",
    alignItems: vertical ? "stretch" : "center",
    gap: mode === "attached" ? 0 : theme.spacing[gap],
  };
  if (mode === "attached") {
    base.borderRadius = theme.radius.md;
    base.overflow = "hidden";
  }
  return (
    <div
      role="group"
      aria-label={label}
      testId={testId}
      style={mergeStyle(base, style)}
    >
      {children}
    </div>
  );
};

/** Related actions: one row by default, one column when vertical. */
export const ButtonGroup = (props: ButtonGroupProps): ReactElement => {
  const theme = useTheme();
  return (
    <GroupShapeContext.Provider
      value={
        props.mode === "separated"
          ? Option.none()
          : Option.some("none" as const)
      }
    >
      {renderButtonGroup(props, theme)}
    </GroupShapeContext.Provider>
  );
};
