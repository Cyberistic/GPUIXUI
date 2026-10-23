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
  lookFromSearch,
  lookParam,
  platformFromSearch,
  platformLabel,
  platformOrder,
  platformParam,
  previewMode,
  resolvePlatformTheme,
  type LookName,
} from "../../lib/platform";
import {
  browserChoiceStorage,
  readRememberedChoice,
  writeRememberedChoice,
} from "../../lib/platform-storage";

/**
 * The platform switch and the look picker.
 *
 * The platform is a library token decision, not a docs style: the switch
 * resolves `platformTheme` from `@gpuixui/tokens`, and every preview reads the
 * families that theme names. The look is the second axis — the authored Luna
 * and Aero styles `retroStyles` ships — applied over the platform's theme, so
 * the picker shows a real library style rather than a docs-only skin. Both
 * choices live in the URL, so a link carries them, and in local storage, so a
 * navigation does not reset them.
 */

interface PlatformState {
  /** The platform every preview shows. */
  readonly platform: PlatformName;
  /** The look painted over that platform. */
  readonly look: LookName;
  /** The library theme the two resolve to. */
  readonly theme: Theme;
  /** Choose a platform. */
  readonly setPlatform: (platform: PlatformName) => void;
  /** Choose a look; `native` keeps the platform's own style. */
  readonly setLook: (look: LookName) => void;
}

const PlatformContext = createContext<PlatformState | null>(null);

/** Put both choices in the address bar without navigating. */
const writeUrl = (platform: PlatformName, look: LookName): void => {
  const url = new URL(window.location.href);
  url.searchParams.set(platformParam, platform);
  if (look === "native") url.searchParams.delete(lookParam);
  else url.searchParams.set(lookParam, look);
  window.history.replaceState(null, "", url.toString());
};

/** Provides the platform and look every preview on the page renders. */
export function PlatformProvider({ children }: { children: ReactNode }) {
  const search = useRouterState({
    select: (state) => state.location.searchStr,
  });
  const [platform, setPlatform] = useState<PlatformName>(
    () => platformFromSearch(search) ?? "darwin",
  );
  const [look, setLook] = useState<LookName>(
    () => lookFromSearch(search) ?? "native",
  );

  // The URL is the source of truth: a shared link carries both choices, and a
  // navigation that drops a parameter restores the remembered one and puts it
  // back, so the address bar always says what is showing.
  useEffect(() => {
    const platformInUrl = platformFromSearch(search);
    const lookInUrl = lookFromSearch(search);
    const storage = browserChoiceStorage();
    const remembered = readRememberedChoice(storage);
    const nextPlatform = platformInUrl ?? remembered.platform;
    const nextLook = lookInUrl ?? remembered.look;

    setPlatform(nextPlatform);
    setLook(nextLook);
    writeRememberedChoice(storage, {
      platform: nextPlatform,
      look: nextLook,
    });
    if (platformInUrl === undefined || lookInUrl === undefined)
      writeUrl(nextPlatform, nextLook);
  }, [search]);

  const choosePlatform = useCallback(
    (next: PlatformName) => {
      setPlatform(next);
      writeRememberedChoice(browserChoiceStorage(), {
        platform: next,
        look,
      });
      writeUrl(next, look);
    },
    [look],
  );

  const chooseLook = useCallback(
    (next: LookName) => {
      setLook(next);
      writeRememberedChoice(browserChoiceStorage(), {
        platform,
        look: next,
      });
      writeUrl(platform, next);
    },
    [platform],
  );

  const theme = useMemo(
    () => resolvePlatformTheme(platform, previewMode, look),
    [platform, look],
  );
  const value = useMemo<PlatformState>(
    () => ({
      platform,
      look,
      theme,
      setPlatform: choosePlatform,
      setLook: chooseLook,
    }),
    [platform, look, theme, choosePlatform, chooseLook],
  );

  return (
    <PlatformContext.Provider value={value}>
      {children}
    </PlatformContext.Provider>
  );
}

/** The platform and look the page is showing. */
export function usePlatform(): PlatformState {
  const value = usePlatformOptional();
  if (value === null) {
    throw new Error("usePlatform: no PlatformProvider above this component");
  }
  return value;
}

/**
 * The platform and look, or `null` where no switch is above the component. A
 * preview must not render without one (it would paint the site's palette); the
 * theme editor may, because its own base is then the built-in theme it shows.
 */
export function usePlatformOptional(): PlatformState | null {
  return useContext(PlatformContext);
}

/** One group of pressed buttons: the same look for both axes. */
function ChoiceGroup<T extends string>({
  label,
  choices,
  selected,
  onSelect,
}: {
  readonly label: string;
  readonly choices: ReadonlyArray<{
    readonly value: T;
    readonly label: string;
  }>;
  readonly selected: T;
  readonly onSelect: (value: T) => void;
}) {
  return (
    <div aria-label={label} className="gx-platform-group" role="group">
      {choices.map((choice) => (
        <button
          aria-pressed={selected === choice.value}
          className="gx-platform-option"
          key={choice.value}
          onClick={() => onSelect(choice.value)}
          type="button"
        >
          {choice.label}
        </button>
      ))}
    </div>
  );
}

/**
 * The switch itself: the platforms the library names, the authored looks, and
 * the theme the two resolve to.
 */
export function PlatformToggle() {
  const { platform, theme, setPlatform } = usePlatform();

  return (
    <div className="gx-platform not-prose">
      <p className="gx-platform-title">Platform</p>
      <ChoiceGroup
        choices={platformOrder.map((option) => ({
          value: option,
          label: platformLabel(option),
        }))}
        label="Platform style"
        onSelect={setPlatform}
        selected={platform}
      />
      <p className="gx-platform-meta">
        {theme.name} · {theme.typography.mono}
      </p>
    </div>
  );
}
