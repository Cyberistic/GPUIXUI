/** @jsxImportSource @gpuix/react */
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

export const Stack = (props: StackProps): ReactElement =>
  renderStack(props, useTheme());

export interface GridProps extends GridSpec, ElementHostProps {
  readonly style?: StyleDesc;

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

export const Grid = (props: GridProps): ReactElement =>
  renderGrid(props, useTheme());
