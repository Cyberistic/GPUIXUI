/**
 * The one way a behaviour suite renders: the real GPUix test renderer, under
 * one theme, at a fixed window size so bounds assertions are stable.
 *
 * Only `src/behaviour/**` may import this file. `createTestRoot` comes from
 * `@gpuix/react/testing`, whose import needs a published native binding: on a
 * host without one the file fails to load rather than skipping, which is why the
 * behaviour suites are a separate vitest project.
 *
 * The native renderer paints one window at a time — a second root takes the
 * window over and the first root's tree reads as empty — so a mounted root is
 * tracked and a second `renderData` throws rather than producing a mysterious
 * empty table.
 */

import { createTestRoot, type TestRoot } from "@gpuix/react/testing";
import { darkTheme, lightTheme } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import type { ReactNode } from "react";

const testThemes = { light: lightTheme, dark: darkTheme } as const;

/** A theme a behaviour suite can render under. */
export type TestTheme = keyof typeof testThemes;

/** A native test root, rerenderable under the theme it was created with. */
export interface DataTestRoot {
  /** The renderer whose real hit-testing, focus and layout the assertions read. */
  readonly renderer: TestRoot["renderer"];
  /** Render a new tree in the same root and theme. */
  readonly rerender: (node: ReactNode) => void;
  /** Tear the root down. */
  readonly unmount: () => void;
}

let mounted = false;

/** Render `node` in the native GPUix test renderer under one theme. */
export const renderData = (
  node: ReactNode,
  theme: TestTheme = "dark",
): DataTestRoot => {
  if (mounted) {
    throw new Error(
      "renderData: a root is still mounted. The native renderer paints one window, so unmount() the previous root before rendering the next.",
    );
  }
  const root = createTestRoot({ width: 1280, height: 800 });
  const render = (next: ReactNode): void => {
    root.render(
      <ThemeProvider theme={testThemes[theme]}>{next}</ThemeProvider>,
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
