/**
 * `Stack` and `Grid` — the two layouts the runtime draws.
 *
 * A Stack is flexbox in one direction; a Grid is the runtime's fixed-size grid.
 * Both are pure resolvers, so their spacing always comes from the theme instead
 * of a call-site pixel value. `Stack`'s recipe (`recipe/stackClass`) is a
 * Tailwind class string compiled through `@gpuixui/tw`; `Grid`'s numeric track
 * template has no utility and stays on `core/layout.ts`.
 */

import type { ReactElement, ReactNode } from "react";
import type { StyleDesc } from "@gpuix/react";
import { cn } from "@gpuixui/tw";
import { gridStyle, type GridSpec, type StackSpec } from "../core/layout.js";
import type { PrimitiveTheme } from "../core/theme.js";
import { stackClass } from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import { mergeStyle } from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

export interface StackProps extends StackSpec {
  readonly style?: StyleDesc;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly children?: ReactNode;
  readonly testId?: string;
}

export const renderStack = (
  { style, className, children, testId, ...spec }: StackProps,
  theme: PrimitiveTheme,
): ReactElement => {
  const resolved = recipeTw.classesToStyle(
    cn(stackClass(spec), className),
    theme,
  );
  return (
    <div testId={testId} style={mergeStyle(resolved.style, style)}>
      {children}
    </div>
  );
};

/** Children laid out along one axis. */
export const Stack = (props: StackProps): ReactElement =>
  renderStack(props, useTheme());

export interface GridProps extends GridSpec {
  readonly style?: StyleDesc;
  readonly children?: ReactNode;
  readonly testId?: string;
}

export const renderGrid = (
  { style, children, testId, ...spec }: GridProps,
  theme: PrimitiveTheme,
): ReactElement => (
  <div testId={testId} style={mergeStyle(gridStyle(spec, theme), style)}>
    {children}
  </div>
);

/**
 * A fixed-size grid of equal tracks.
 *
 * The runtime's grid is numeric — no track strings, no auto-flow, no named
 * areas (plan 020 §1.2) — so anything raggedy belongs in a wrapping `Stack`.
 */
export const Grid = (props: GridProps): ReactElement =>
  renderGrid(props, useTheme());
