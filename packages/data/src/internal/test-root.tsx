/** @jsxImportSource @gpuix/react */

import { createTestRoot, type TestRoot } from "@gpuix/react/testing";
import { MotionProvider } from "@gpuixui/motion/react";
import { darkTheme, lightTheme } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import type { ReactNode } from "react";

const testThemes = { light: lightTheme, dark: darkTheme } as const;

export type TestTheme = keyof typeof testThemes;

export interface RenderOptions {
  readonly motion?: "animated" | "reduced";
}

export interface DataTestRoot {
  readonly renderer: TestRoot["renderer"];
  readonly rerender: (node: ReactNode) => void;
  /** Tear the root down. */
  readonly unmount: () => void;
}

let mounted = false;

/** Render `node` in the native GPUix test renderer under one theme. */
export const renderData = (
  node: ReactNode,
  theme: TestTheme = "dark",
  options: RenderOptions = {},
): DataTestRoot => {
  if (mounted) {
    throw new Error(
      "renderData: a root is still mounted. The native renderer paints one window, so unmount() the previous root before rendering the next.",
    );
  }
  const root = createTestRoot({ width: 1280, height: 800 });
  const motion = options.motion ?? "reduced";
  const render = (next: ReactNode): void => {
    root.render(
      <ThemeProvider theme={testThemes[theme]}>
        <MotionProvider preference={motion}>{next}</MotionProvider>
      </ThemeProvider>,
    );
  };
  render(node);
  mounted = true;
  return {
    renderer: root.renderer,
    rerender: render,
    unmount: () => {
      mounted = false;
      root.unmount();
    },
  };
};

/** Dispatch the paint-driven events a render queued (`onLayout`), then paint. */
export const settle = (root: DataTestRoot): void => {
  root.renderer.dispatchNativeEvents();
  root.renderer.flush();
};
