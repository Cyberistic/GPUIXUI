/** @jsxImportSource @gpuix/react */
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

/** Whether a value names a group mode. */
export const isButtonGroupMode = (value: unknown): value is ButtonGroupMode =>
  P.isString(value) && Arr.contains(MODE_NAMES, value);

/**
 * The mode a group paints: the name, or the documented `attached`.
 *
 * A toolbar is saved with its mode (`attached` while it reads as one segmented
 * control), so a name a release renamed reaches the component as a string the
 * union no longer names. Read raw, the class recipe's `mode === "attached"` was
 * false and the group painted the **separated** gap — the opposite of the
 * prop's documented default — so a restored toolbar came back with its actions
 * pulled apart.
 */
export const buttonGroupModeOf = (value: unknown): ButtonGroupMode =>
  isButtonGroupMode(value) ? value : "attached";

/** The axis a group lays its actions on. */
export const BUTTON_GROUP_ORIENTATIONS = ["horizontal", "vertical"] as const;
export type ButtonGroupOrientation = (typeof BUTTON_GROUP_ORIENTATIONS)[number];

const ORIENTATION_NAMES: ReadonlyArray<string> = BUTTON_GROUP_ORIENTATIONS;

/** Whether a value names a group axis. */
export const isButtonGroupOrientation = (
  value: unknown,
): value is ButtonGroupOrientation =>
  P.isString(value) && Arr.contains(ORIENTATION_NAMES, value);

/** The axis a group paints: the name, or the documented `horizontal`. */
export const buttonGroupOrientationOf = (
  value: unknown,
): ButtonGroupOrientation =>
  isButtonGroupOrientation(value) ? value : "horizontal";

export interface ButtonGroupProps extends ElementHostProps {
  /** Defaults to `attached`. */
  readonly mode?: ButtonGroupMode;
  /**
   * Defaults to `horizontal`. A vertical group shares one width between its
   * actions, so their ends line up; a square action keeps its own size.
   */
  readonly orientation?: ButtonGroupOrientation;
  /**
   * A gap on the theme's spacing scale, for `separated`. Defaults to `sm`.
   *
   * A toolbar is saved with its gap as readily as with its mode, and JSON keeps
   * a field a record never set as `null` rather than absent — so the prop takes
   * that absence, and both it and a step this release does not carry paint the
   * documented `sm` rather than the actions flush (`spaceStep`).
   */
  readonly gap?: SpaceStep | null;
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
  // Mode, axis and gap are the three choices a toolbar is saved with, and each
  // is resolved once here so the classes and the actions they clip cannot
  // disagree. A gap the theme does not carry is the documented `sm`: a group
  // whose saved step went missing came back with its actions touching, which is
  // the silhouette of `attached` and not of a separated group.
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

/** A row of related buttons. */
export const ButtonGroup = (props: ButtonGroupProps): ReactElement =>
  renderButtonGroup(props, useTheme());
