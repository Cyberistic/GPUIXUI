/** @jsxImportSource @gpuix/react */
import { ThemeProvider } from "@gpuixui/tokens/react";
import type { Theme } from "@gpuixui/tokens";
import type { ReactNode } from "react";

/**
 * The wrapper the live block route mounts through the reconciler.
 *
 * The pragma is the reconciler's: the theme provider is a GPUix component, and
 * the block below it is the package's own tree. Keeping it in its own file is
 * what lets the route stay on the DOM runtime — only this tree is painted by
 * the wasm renderer.
 */
export const LiveBlockScene = ({
  theme,
  children,
}: {
  readonly theme: Theme;
  readonly children: ReactNode;
}) => <ThemeProvider theme={theme}>{children}</ThemeProvider>;
