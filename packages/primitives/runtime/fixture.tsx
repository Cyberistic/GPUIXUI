/**
 * What every runtime suite mounts its component inside, and the one place a
 * window is opened.
 *
 * **One window per test, never per file.** A re-render replaces the React tree,
 * but GPUI keeps the native state of a host element that is reused — measured:
 * a second `<input>` in the same window started with the previous test's text
 * (plan 041 §9). A fresh window is the only isolation that is actually true, and
 * it is what makes the editing tests in `fields.runtime.test.tsx` meaningful.
 *
 * The window's own root is not a flex column either, so a tree mounted straight
 * into it lays its siblings out at (0,0) on top of each other. `Surface` gives
 * every suite the same deterministic frame: one column-flex `Box` on the
 * background surface, padded by the theme's `lg` step. Tests then read positions
 * relative to the theme's own numbers instead of magic pixels.
 */

import { Effect } from "effect";
import type { ReactNode } from "react";
import { Box } from "../src/components/Box.js";
import { ThemeProvider } from "../src/components/ThemeProvider.js";
import { testTheme, testThemeDark } from "../src/core/testing/theme.fixture.js";
import type { Density, PrimitiveTheme } from "../src/core/theme.js";
import { createRuntime, type Runtime } from "../src/testing/index.js";

export { testTheme, testThemeDark };

/** The `testId` of the frame every test mounts into. */
export const SURFACE = "surface";

/** The window every runtime suite opens. */
export const WINDOW = { width: 1280, height: 800 } as const;

export interface SurfaceProps {
  readonly children: ReactNode;
  readonly theme?: PrimitiveTheme;
  readonly density?: Density;
}

export const Surface = ({
  children,
  theme = testTheme,
  density,
}: SurfaceProps): ReactNode => (
  <ThemeProvider theme={theme} density={density}>
    <Box tone="background" padding="lg" testId={SURFACE}>
      {children}
    </Box>
  </ThemeProvider>
);

/** A fresh window for one test — the test boundary (`Effect.runPromise`). */
export const openWindow = (
  size: { readonly width?: number; readonly height?: number } = {},
): Promise<Runtime> => Effect.runPromise(createRuntime({ ...WINDOW, ...size }));

/** A real timer, for the one thing GPUI's clock cannot advance: a JS interval. */
export const sleep = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

/**
 * Wait for the native-focus tracker's next sample.
 *
 * The tracker is a JS interval (`NativeFocusProvider`), not a GPUI timer, so
 * `advance` cannot move it. One poll interval plus a margin is enough for React
 * to re-render with the focused host id (plan `590`).
 */
export const FOCUS_SETTLE_MS = 70;

/** Wait long enough for the tracker to see a focus change and repaint. */
export const settleFocus = (): Promise<void> => sleep(FOCUS_SETTLE_MS);
