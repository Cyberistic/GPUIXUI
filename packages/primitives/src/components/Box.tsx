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
 */

import type { ReactElement, ReactNode } from "react";
import type { StyleDesc } from "@gpuix/react";
import { cn } from "@gpuixui/tw";
import type { BoxSpec } from "../core/layout.js";
import type { PrimitiveTheme } from "../core/theme.js";
import { boxClass } from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import { mergeStyle } from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

export interface BoxProps extends BoxSpec {
  readonly style?: StyleDesc;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly children?: ReactNode;
  readonly testId?: string;
}

export const renderBox = (
  { style, className, children, testId, ...spec }: BoxProps,
  theme: PrimitiveTheme,
): ReactElement => {
  const resolved = recipeTw.classesToStyle(
    cn(boxClass(spec), className),
    theme,
  );
  return (
    <div testId={testId} style={mergeStyle(resolved.style, style)}>
      {children}
    </div>
  );
};

/** A container. */
export const Box = (props: BoxProps): ReactElement =>
  renderBox(props, useTheme());
