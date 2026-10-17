/**
 * What every runtime suite mounts its component inside.
 *
 * The window's own root is not a flex column, so a component mounted straight
 * into it would be laid out at (0,0) and overlap its siblings (measured in plan
 * 041 §9). `Surface` gives every suite the same deterministic frame: one
 * column-flex `Box` on the background surface, padded by the theme's `lg` step.
 * Tests then read positions relative to the theme's own numbers instead of
 * magic pixels.
 */

import type { ReactNode } from "react";
import { Box } from "../src/components/Box.js";
import { ThemeProvider } from "../src/components/ThemeProvider.js";
import { testTheme } from "../src/core/testing/theme.fixture.js";
import type { Density, PrimitiveTheme } from "../src/core/theme.js";

export { testTheme };

/** The `testId` of the frame every test mounts into. */
export const SURFACE = "surface";

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

/** The window every runtime suite opens. */
export const WINDOW = { width: 1280, height: 800 } as const;

/** A real timer, for the one thing GPUI's clock cannot advance: a JS interval. */
export const sleep = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));
