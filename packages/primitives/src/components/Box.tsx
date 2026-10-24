/** @jsxImportSource @gpuix/react */
/**
 * `Box` — a container.
 *
 * The runtime's one box primitive with the surface resolvers applied. It is the
 * only place a raw `style` prop is merged over a resolved one, so a caller can
 * reach anything the named props do not cover without the library growing a
 * prop for it.
 *
 * The resting appearance is a Tailwind recipe (`recipe/boxClass`), compiled
 * through `@gpuixui/tw`; the caller's `className` is joined last so it wins
 * conflicts exactly as `cn` resolves them. Padding takes one step for all four
 * sides, or `paddingX`/`paddingY` for the two axes; a border can be dashed and
 * a box can hold an aspect ratio, both of which the runtime paints.
 *
 * The element is the caller's: `ref`, `aria-id` and `onLayout` reach the painted
 * `div` (`ElementHostProps`), so a region is measured, named for automation or
 * held where it is painted. A wrapper would be the flex item, so a `grow`ing box
 * inside one would have to repeat its own flex facts on the wrapper.
 */

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
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
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

/** A container. */
export const Box = (props: BoxProps): ReactElement =>
  renderBox(props, useTheme());
