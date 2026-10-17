/**
 * `Box` — a container.
 *
 * The runtime's one box primitive with the surface resolvers applied. It is the
 * only place a raw `style` prop is merged over a resolved one, so a caller can
 * reach anything the named props do not cover without the library growing a
 * prop for it.
 */

import type { ReactElement, ReactNode } from "react";
import type { StyleDesc } from "@gpuix/react";
import { boxStyle, type BoxSpec } from "../core/layout.js";
import type { PrimitiveTheme } from "../core/theme.js";
import { mergeStyle } from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

export interface BoxProps extends BoxSpec {
  readonly style?: StyleDesc;
  readonly children?: ReactNode;
  readonly testId?: string;
}

export const renderBox = (
  { style, children, testId, ...spec }: BoxProps,
  theme: PrimitiveTheme,
): ReactElement => (
  <div testId={testId} style={mergeStyle(boxStyle(spec, theme), style)}>
    {children}
  </div>
);

/** A container. */
export const Box = (props: BoxProps): ReactElement =>
  renderBox(props, useTheme());
