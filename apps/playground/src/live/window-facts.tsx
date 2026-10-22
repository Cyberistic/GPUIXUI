/**
 * What the runner opened the window with.
 *
 * A window reports neither its options nor its backdrop — `getWindowSize` is the
 * only window *size* query the renderer publishes — so the runner is the only
 * source of truth for what it asked `init` for. A probe reads it here rather
 * than restating the CLI flag, so a probe that asserted "transparent" while the
 * window opened opaque cannot pass.
 *
 * The `window-backdrop` probe paints this value into its readout and asserts the
 * frame against it, and `window-chrome` asserts the insets against the titlebar
 * mode it opened with; anything else that needs a window fact the renderer does
 * not report belongs here too.
 */
import { createContext, useContext, type ReactNode } from "react";
import { defaultWindowBackground, type WindowBackground } from "./backdrop.js";
import { defaultTitlebarChrome, type TitlebarChrome } from "./chrome.js";

/** The window facts the runner knows and the renderer cannot report. */
export interface WindowFacts {
  readonly background: WindowBackground;
  readonly chrome: TitlebarChrome;
}

const WindowFactsContext = createContext<WindowFacts>({
  background: defaultWindowBackground,
  chrome: defaultTitlebarChrome,
});

/** Read the facts of the window this tree is mounted in. */
export const useWindowFacts = (): WindowFacts => useContext(WindowFactsContext);

/** Wraps `child` in the facts the runner opened its window with. */
export const withWindowFacts = (
  facts: WindowFacts,
  child: ReactNode,
): ReactNode => (
  <WindowFactsContext.Provider value={facts}>
    {child}
  </WindowFactsContext.Provider>
);
