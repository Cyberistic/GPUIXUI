/**
 * The one way a behaviour suite renders: the real GPUix test renderer, under one
 * theme, at a fixed window size so bounds assertions are stable (plan 110 §10).
 *
 * Only `src/behaviour/**` may import this file. `createTestRoot` comes from
 * `@gpuix/react/testing`, whose import needs a published native binding: on a
 * host without one the file fails to load rather than skipping, which is why the
 * behaviour suites are a separate vitest project (plan 117 §5a–§5c).
 */

import { createTestRoot, type TestRoot } from "@gpuix/react/testing";
import type { ReactNode } from "react";
import { darkTheme, lightTheme, ThemeProvider } from "./theme.js";

const testThemes = { light: lightTheme, dark: darkTheme } as const;

/** A theme a behaviour suite can render under. */
export type TestTheme = keyof typeof testThemes;

/** A native test root, rerenderable under the theme it was created with. */
export interface ComponentTestRoot {
  /** The renderer whose real hit-testing, focus and layout the assertions read. */
  readonly renderer: TestRoot["renderer"];
  /** Render a new tree in the same root and theme. */
  readonly rerender: (node: ReactNode) => void;
  /** Tear the root down. */
  readonly unmount: () => void;
}

/**
 * Whether a root from this module is mounted. The native renderer paints one
 * window at a time: a second `createTestRoot` takes the window over and the
 * first root's tree reads as empty, which looks like a component that rendered
 * nothing. Measured on this host, 2026-10-17 — a theme test that held two roots
 * read `backgroundColor: undefined` for the first.
 */
let mounted = false;

/**
 * Render `node` in the native GPUix test renderer under one theme. Throws when a
 * previous root is still mounted, so the one-window rule is enforced rather than
 * misread as a missing component. A raw `throw` is deliberate: misusing a test
 * harness is a programming error at the boundary, not a domain failure a caller
 * could recover from (plan 110 §8.6 takes the same line for compound parts).
 */
export const renderComponent = (
  node: ReactNode,
  theme: TestTheme = "dark",
): ComponentTestRoot => {
  if (mounted) {
    throw new Error(
      "renderComponent: a root is still mounted. The native renderer paints one window, so unmount() the previous root before rendering the next.",
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
