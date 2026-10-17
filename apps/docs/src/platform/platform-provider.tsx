import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouterState } from "@tanstack/react-router";
import { platformTypes, type PlatformName } from "@gpuixui/tokens";
import {
  applyPlatformToSearch,
  PLATFORM_STORAGE_KEY,
  platformFromParams,
  resolvePlatform,
  storedPlatform,
} from "./platform";

interface PlatformContextValue {
  readonly platform: PlatformName;
  readonly setPlatform: (platform: PlatformName) => void;
}

const PlatformContext = createContext<PlatformContextValue>({
  platform: "default",
  setPlatform: () => {},
});

export const usePlatform = (): PlatformContextValue =>
  useContext(PlatformContext);

const readStored = (): PlatformName | undefined => {
  try {
    return storedPlatform(window.localStorage.getItem(PLATFORM_STORAGE_KEY));
  } catch {
    return undefined;
  }
};

const writeStored = (platform: PlatformName): void => {
  try {
    window.localStorage.setItem(PLATFORM_STORAGE_KEY, platform);
  } catch {
    // Private mode: the URL still carries the choice, so the page keeps working.
  }
};

const replaceSearch = (platform: PlatformName): void => {
  const url = new URL(window.location.href);
  const search = applyPlatformToSearch(url.search, platform);
  if (search === url.search) return;
  window.history.replaceState(
    window.history.state,
    "",
    `${url.pathname}${search}${url.hash}`,
  );
};

/**
 * The docs' platform style (MISSION "Platform styles"). State lives in the URL
 * (`?platform=`) so a link is shareable, and in `localStorage` so a navigation
 * that drops the query string does not forget the reader's choice. The provider
 * applies the choice as `data-platform` and the package's mono family; the UI
 * face (`.SystemUIFont`) only resolves inside the native runtime, so the docs
 * never pretend to set it.
 */
export function PlatformProvider({ children }: { children: ReactNode }) {
  const [platform, setPlatformState] = useState<PlatformName>("default");
  const href = useRouterState({ select: (state) => state.location.href });

  useEffect(() => {
    const params = new URL(window.location.href).searchParams;
    const fromUrl = platformFromParams(params);
    const next = resolvePlatform(fromUrl, readStored());
    setPlatformState(next);
    writeStored(next);
    if (fromUrl === undefined && next !== "default") replaceSearch(next);
  }, [href]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.platform = platform;
    root.style.setProperty("--platform-mono", platformTypes[platform].mono);
  }, [platform]);

  const setPlatform = useCallback((next: PlatformName) => {
    setPlatformState(next);
    writeStored(next);
    replaceSearch(next);
  }, []);

  return (
    <PlatformContext.Provider value={{ platform, setPlatform }}>
      {children}
    </PlatformContext.Provider>
  );
}
