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
import * as Arr from "effect/Array";
import type { ReactNode } from "react";
import { afterEach } from "vitest";
import { Box } from "../src/components/Box.js";
import { NATIVE_FOCUS_POLL_MS } from "../src/components/native-focus.js";
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

/** Every window opened during the current test. */
const opened: Runtime[] = [];

/**
 * Every window is closed after its test.
 *
 * A `TestRoot` owns a React root; leaving it mounted leaves the theme
 * provider's focus-tracker interval (plan `590`) running for the rest of the
 * file, so focus and timer assertions depended on how many tests had already
 * run (plan `379` §6). The fixture closes them after the body (plan `594`).
 */
afterEach(() => {
  Arr.forEach(opened.splice(0), (runtime) => runtime.unmount());
});

/** A fresh window for one test — the test boundary (`Effect.runPromise`). */
export const openWindow = async (
  size: { readonly width?: number; readonly height?: number } = {},
): Promise<Runtime> => {
  const runtime = await Effect.runPromise(
    createRuntime({ ...WINDOW, ...size }),
  );
  opened.push(runtime);
  return runtime;
};

/** A real timer, for the one thing GPUI's clock cannot advance: a JS interval. */
export const sleep = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

/**
 * Wait for the native-focus tracker to settle.
 *
 * The tracker is a JS interval (`NativeFocusProvider`), not a GPUI timer, so
 * `advance` cannot move it. Two poll intervals are needed: one render publishes
 * the sample, and a control that derives state from the sample (its ring, or the
 * `NumberField` blur commit) renders again before the paint or the caller's
 * value can be asserted (plans `590`, `591`).
 */
export const FOCUS_SETTLE_MS = 2 * NATIVE_FOCUS_POLL_MS + 20;

/**
 * Wait long enough for the tracker to see a focus change and repaint.
 *
 * A floor, not a synchronization primitive: the tracker polls every 50 ms and
 * React paints a render after that, so under load this can elapse before the
 * frame the caller is about to read. A test that asserts a **paint** must use
 * `awaitFrame` with its own condition (plan `691`).
 */
export const settleFocus = (): Promise<void> => sleep(FOCUS_SETTLE_MS);

/**
 * Wait until the last painted frame satisfies `condition`, or fail with `what`.
 *
 * The tracker's paint is a sample plus a render, so a fixed sleep races it
 * (measured: a renderer reporting focus 300 ms late paints no ring at 120 ms,
 * and two of three full runs failed 2–3 ring cases while the files passed
 * scoped — plan `691`). Polling the frame lets a late paint pass while a paint
 * that never happens still fails, by the phrase the caller named.
 */
export const awaitFrame = async (
  condition: () => boolean,
  what: string,
  timeoutMs = 2000,
): Promise<void> => {
  const poll = async (remaining: number): Promise<void> => {
    if (condition()) return;
    if (remaining <= 0)
      throw new Error(`timed out after ${timeoutMs} ms waiting for ${what}`);
    await sleep(10);
    return poll(remaining - 1);
  };
  return poll(Math.max(1, Math.ceil(timeoutMs / 10)));
};
