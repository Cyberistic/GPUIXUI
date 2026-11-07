/** @jsxImportSource @gpuix/react */
import type { ReactElement, ReactNode } from "react";
import type { StyleDesc } from "@gpuix/react";
import { cn } from "@gpuixui/tw";
import * as Arr from "effect/Array";
import * as P from "effect/Predicate";
import { accessibleName } from "../core/a11y.js";
import { spaceStep } from "../core/theme.js";
import type { PrimitiveTheme, SpaceStep } from "../core/theme.js";
import { buttonGroupClass } from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import {
  mergeStyle,
  AttachedGroup,
  type ElementHostProps,
} from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

export const BUTTON_GROUP_MODES = ["attached", "separated"] as const;
export type ButtonGroupMode = (typeof BUTTON_GROUP_MODES)[number];

const MODE_NAMES: ReadonlyArray<string> = BUTTON_GROUP_MODES;

export const isButtonGroupMode = (value: unknown): value is ButtonGroupMode =>
  P.isString(value) && Arr.contains(MODE_NAMES, value);

export const buttonGroupModeOf = (value: unknown): ButtonGroupMode =>
  isButtonGroupMode(value) ? value : "attached";

export const BUTTON_GROUP_ORIENTATIONS = ["horizontal", "vertical"] as const;
export type ButtonGroupOrientation = (typeof BUTTON_GROUP_ORIENTATIONS)[number];

const ORIENTATION_NAMES: ReadonlyArray<string> = BUTTON_GROUP_ORIENTATIONS;

export const isButtonGroupOrientation = (
  value: unknown,
): value is ButtonGroupOrientation =>
  P.isString(value) && Arr.contains(ORIENTATION_NAMES, value);

export const buttonGroupOrientationOf = (
  value: unknown,
): ButtonGroupOrientation =>
  isButtonGroupOrientation(value) ? value : "horizontal";

export interface ButtonGroupProps extends ElementHostProps {
  readonly mode?: ButtonGroupMode;

  readonly orientation?: ButtonGroupOrientation;

  readonly gap?: SpaceStep | null;

  readonly label?: string;
  readonly style?: StyleDesc;

  readonly className?: string;
  readonly children?: ReactNode;
  readonly testId?: string;
}

export const renderButtonGroup = (
  {
    mode,
    orientation,
    gap = "sm",
    label,
    style,
    className,
    children,
    testId,
    ref,
    "aria-id": controlId,
    onLayout,
  }: ButtonGroupProps,
  theme: PrimitiveTheme,
): ReactElement => {
  const shape = buttonGroupModeOf(mode);
  const axis = buttonGroupOrientationOf(orientation);
  const distance = spaceStep(theme, gap) ?? "sm";
  const resolved = recipeTw.classesToStyle(
    cn(buttonGroupClass(shape, distance, axis), className),
    theme,
  );
  return (
    <div
      ref={ref}
      role="group"
      aria-label={accessibleName(label)}
      aria-id={controlId}
      onLayout={onLayout}
      testId={testId}
      style={mergeStyle(resolved.style, style)}
    >
      <AttachedGroup.Provider value={shape === "attached"}>
        {children}
      </AttachedGroup.Provider>
    </div>
  );
};

export const ButtonGroup = (props: ButtonGroupProps): ReactElement =>
  renderButtonGroup(props, useTheme());
