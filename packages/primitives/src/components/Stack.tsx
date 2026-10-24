/** @jsxImportSource @gpuix/react */
/**
 * `Stack` and `Grid` — the two layouts the runtime draws.
 *
 * A Stack is flexbox in one direction; a Grid is the runtime's fixed-size grid.
 * Both are pure resolvers, so their spacing always comes from the theme instead
 * of a call-site pixel value. Their recipes (`recipe/stackClass`,
 * `recipe/gridClass`) are Tailwind class strings compiled through `@gpuixui/tw`.
 *
 * Both, and `Spacer`, take the runtime's host trio (`ref`, `aria-id`,
 * `onLayout`): a layout is often the thing a caller measures — a panel's box,
 * a row's height, the content a scroll reading divides by — and wrapping it in
 * a `div` to reach that measurement changes the layout, because the wrapper is
 * the flex item.
 */

import type { ReactElement, ReactNode } from "react";
import type { StyleDesc } from "@gpuix/react";
import { cn } from "@gpuixui/tw";
import type { GridSpec, StackSpec } from "../core/layout.js";
import type { PrimitiveTheme } from "../core/theme.js";
import { gridClass, stackClass } from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import { mergeStyle, type ElementHostProps } from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

export interface StackProps extends StackSpec, ElementHostProps {
  readonly style?: StyleDesc;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly children?: ReactNode;
  readonly testId?: string;
}

export const renderStack = (
  {
    style,
    className,
    children,
    testId,
    ref,
    "aria-id": controlId,
    onLayout,
    ...spec
  }: StackProps,
  theme: PrimitiveTheme,
): ReactElement => {
  const resolved = recipeTw.classesToStyle(
    cn(stackClass(spec), className),
    theme,
  );
  return (
    <div
      ref={ref}
      aria-id={controlId}
      onLayout={onLayout}
      testId={testId}
      style={mergeStyle(resolved.style, style)}
    >
      {children}
    </div>
  );
};

/** Children laid out along one axis. */
export const Stack = (props: StackProps): ReactElement =>
  renderStack(props, useTheme());

export interface GridProps extends GridSpec, ElementHostProps {
  readonly style?: StyleDesc;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly children?: ReactNode;
  readonly testId?: string;
}

export const renderGrid = (
  {
    style,
    className,
    children,
    testId,
    ref,
    "aria-id": controlId,
    onLayout,
    ...spec
  }: GridProps,
  theme: PrimitiveTheme,
): ReactElement => {
  const resolved = recipeTw.classesToStyle(
    cn(gridClass(spec), className),
    theme,
  );
  return (
    <div
      ref={ref}
      aria-id={controlId}
      onLayout={onLayout}
      testId={testId}
      style={mergeStyle(resolved.style, style)}
    >
      {children}
    </div>
  );
};

/**
 * A fixed-size grid of equal tracks.
 *
 * The runtime's grid is numeric — no track strings, no auto-flow, no named
 * areas (see `docs/gpuix-capabilities.md`) — so anything raggedy belongs in a wrapping `Stack`.
 */
export const Grid = (props: GridProps): ReactElement =>
  renderGrid(props, useTheme());
