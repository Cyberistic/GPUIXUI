import { Effect } from "effect";
import type { ReactNode } from "react";
import { Box } from "../src/components/Box.js";
import { ThemeProvider } from "../src/components/ThemeProvider.js";
import type { PrimitiveMessages } from "../src/core/messages.js";
import { testTheme, testThemeDark } from "../src/core/testing/theme.fixture.js";
import type { Density, PrimitiveTheme } from "../src/core/theme.js";
import { createRuntime, type Runtime } from "./harness.js";

export { testTheme, testThemeDark };

export const SURFACE = "surface";

export const WINDOW = { width: 1280, height: 800 } as const;

export interface SurfaceProps {
  readonly children: ReactNode;
  readonly theme?: PrimitiveTheme;
  readonly density?: Density;

  readonly messages?: Partial<PrimitiveMessages>;
}

export const Surface = ({
  children,
  theme = testTheme,
  density,
  messages,
}: SurfaceProps): ReactNode => (
  <ThemeProvider theme={theme} density={density} messages={messages}>
    <Box tone="background" padding="lg" testId={SURFACE}>
      {children}
    </Box>
  </ThemeProvider>
);

export const openWindow = (): Promise<Runtime> =>
  Effect.runPromise(createRuntime(WINDOW));

export const sleep = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));
