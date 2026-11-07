/** @jsxImportSource @gpuix/react */
import type { ReactElement, ReactNode } from "react";
import type { StyleDesc } from "@gpuix/react";
import { cn } from "@gpuixui/tw";
import type { BoxSpec } from "../core/layout.js";
import type { PrimitiveTheme } from "../core/theme.js";
import { boxClass } from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import { mergeStyle, type ElementHostProps } from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

export interface BoxProps extends BoxSpec, ElementHostProps {
  readonly style?: StyleDesc;

  readonly className?: string;
  readonly children?: ReactNode;
  readonly testId?: string;
}

export const renderBox = (
  {
    style,
    className,
    children,
    testId,
    ref,
    "aria-id": controlId,
    onLayout,
    ...spec
  }: BoxProps,
  theme: PrimitiveTheme,
): ReactElement => {
  const resolved = recipeTw.classesToStyle(
    cn(boxClass(spec), className),
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

export const Box = (props: BoxProps): ReactElement =>
  renderBox(props, useTheme());
