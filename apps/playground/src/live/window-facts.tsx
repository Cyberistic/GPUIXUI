import { createContext, useContext, type ReactNode } from "react";
import { defaultWindowBackground, type WindowBackground } from "./backdrop.js";
import { defaultTitlebarChrome, type TitlebarChrome } from "./chrome.js";

export interface WindowFacts {
  readonly background: WindowBackground;
  readonly chrome: TitlebarChrome;
}

const WindowFactsContext = createContext<WindowFacts>({
  background: defaultWindowBackground,
  chrome: defaultTitlebarChrome,
});

export const useWindowFacts = (): WindowFacts => useContext(WindowFactsContext);

export const withWindowFacts = (
  facts: WindowFacts,
  child: ReactNode,
): ReactNode => (
  <WindowFactsContext.Provider value={facts}>
    {child}
  </WindowFactsContext.Provider>
);
