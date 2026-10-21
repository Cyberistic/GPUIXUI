import { useRouterState } from "@tanstack/react-router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { PlatformName, Theme } from "@gpuixui/tokens";
import {
  parsePlatform,
  platformFromSearch,
  platformLabel,
  platformOrder,
  platformParam,
  resolvePlatformTheme,
} from "../../lib/platform";

/**
 * The platform switch.
 *
 * The platform is a library token decision, not a docs style: the switch
 * resolves `platformTheme` from `@gpuixui/tokens`, and every preview reads the
 * families that theme names. The choice lives in the URL, so a link carries it,
 * and in local storage, so it survives a navigation.
 */

/** Where the chosen platform is remembered between visits. */
const STORAGE_KEY = "gpuixui-platform";

interface PlatformState {
  /** The platform every preview shows. */
  readonly platform: PlatformName;
  /** The library theme that platform resolves to. */
  readonly theme: Theme;
  /** Choose a platform. */
  readonly setPlatform: (platform: PlatformName) => void;
}

const PlatformContext = createContext<PlatformState | null>(null);

/** The platform the reader chose last, or the default. */
const remembered = (): PlatformName =>
  parsePlatform(window.localStorage.getItem(STORAGE_KEY)) ?? "default";

/** Put the platform in the address bar without navigating. */
const writeUrl = (platform: PlatformName): void => {
  const url = new URL(window.location.href);
  url.searchParams.set(platformParam, platform);
  window.history.replaceState(null, "", url.toString());
};

/** Provides the platform every preview on the page renders. */
export function PlatformProvider({ children }: { children: ReactNode }) {
  const search = useRouterState({
    select: (state) => state.location.searchStr,
  });
  const [platform, setPlatform] = useState<PlatformName>(
    () => platformFromSearch(search) ?? "default",
  );

  // The URL is the source of truth: a shared link carries a platform, and a
  // navigation that drops the parameter restores the remembered one and puts it
  // back, so the address bar always says which platform is showing.
  useEffect(() => {
    const fromUrl = platformFromSearch(search);
    const next = fromUrl ?? remembered();
    setPlatform(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    if (fromUrl === undefined) writeUrl(next);
  }, [search]);

  const choose = useCallback((next: PlatformName) => {
    setPlatform(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    writeUrl(next);
  }, []);

  const theme = useMemo(() => resolvePlatformTheme(platform), [platform]);
  const value = useMemo<PlatformState>(
    () => ({ platform, theme, setPlatform: choose }),
    [platform, theme, choose],
  );

  return (
    <PlatformContext.Provider value={value}>
      {children}
    </PlatformContext.Provider>
  );
}

/** The platform the page is showing. */
export function usePlatform(): PlatformState {
  const value = useContext(PlatformContext);
  if (value === null) {
    throw new Error("usePlatform: no PlatformProvider above this component");
  }
  return value;
}

/**
 * The switch itself: the platforms the library names, and the theme the
 * current one resolves to.
 */
export function PlatformToggle() {
  const { platform, theme, setPlatform } = usePlatform();

  return (
    <div className="gx-platform not-prose">
      <p className="gx-platform-title">Platform</p>
      <div
        aria-label="Platform style"
        className="gx-platform-group"
        role="group"
      >
        {platformOrder.map((option) => (
          <button
            aria-pressed={platform === option}
            className="gx-platform-option"
            key={option}
            onClick={() => setPlatform(option)}
            type="button"
          >
            {platformLabel(option)}
          </button>
        ))}
      </div>
      <p className="gx-platform-meta">
        {platformLabel(platform)} · {theme.typography.mono}
      </p>
    </div>
  );
}
