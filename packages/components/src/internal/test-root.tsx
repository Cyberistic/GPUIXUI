/** @jsxImportSource @gpuix/react */
import { createTestRoot, type TestRoot } from "@gpuix/react/testing";
import type { ReactNode } from "react";
import { darkTheme, lightTheme, ThemeProvider, type Theme } from "./theme.js";

const testThemes = { light: lightTheme, dark: darkTheme } as const;

export type TestTheme = keyof typeof testThemes;

export type RenderTheme = TestTheme | Theme;

export interface ComponentTestRoot {
  readonly renderer: TestRoot["renderer"];

  readonly rerender: (node: ReactNode) => void;

  readonly unmount: () => void;
}

let mounted = false;

export interface TestViewport {
  readonly width: number;
  readonly height: number;
}

export const DEFAULT_VIEWPORT: TestViewport = { width: 1280, height: 800 };

export const renderComponent = (
  node: ReactNode,
  theme: RenderTheme = "dark",
  viewport: TestViewport = DEFAULT_VIEWPORT,
): ComponentTestRoot => {
  if (mounted) {
    throw new Error(
      "renderComponent: a root is still mounted. The native renderer paints one window, so unmount() the previous root before rendering the next.",
    );
  }

  const resolved = typeof theme === "string" ? testThemes[theme] : theme;
  const root = createTestRoot({
    width: viewport.width,
    height: viewport.height,
  });
  const render = (next: ReactNode): void => {
    root.render(<ThemeProvider theme={resolved}>{next}</ThemeProvider>);
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
