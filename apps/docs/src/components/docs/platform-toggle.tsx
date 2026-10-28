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
import type { PlatformName, Theme, ThemeMode } from "@gpuixui/tokens";
import {
  browserSignals,
  choosingPlatform,
  detectLook,
  detectPlatform,
  lookFromSearch,
  lookParam,
  modeFromSearch,
  modeLabel,
  modeOrder,
  modeParam,
  namesOmarchy,
  openingChoice,
  platformFromSearch,
  platformLabel,
  platformOrder,
  platformParam,
  previewMode,
  resolvePlatformTheme,
  type LookName,
  type PreviewChoice,
} from "../../lib/platform";
import {
  browserChoiceStorage,
  readDesktopMarker,
  readRememberedChoice,
  writeRememberedChoice,
} from "../../lib/platform-storage";

/**
 * The preview switch: platform, palette and look.
 *
 * The platform is a library token decision, not a docs style: the switch
 * resolves `platformTheme` from `@gpuixui/tokens`, and every preview reads the
 * families that theme names. The palette is the library's other axis — its
 * light and dark themes, so a component can be seen in both — and the look is
 * the third: the authored looks `retroStyles` ships, applied over the
 * platform's theme, so a picker shows a real library style rather than a
 * docs-only skin. Every choice lives in the URL, so a link carries it, and in
 * local storage, so a navigation does not reset it. A first visit has neither,
 * so it opens on the platform the browser reports.
 */

interface PlatformState {
  /** The platform every preview shows. */
  readonly platform: PlatformName;
  /** The look painted over that platform. */
  readonly look: LookName;
  /** The palette every preview paints: the library's light or dark theme. */
  readonly mode: ThemeMode;
  /** The library theme the three resolve to. */
  readonly theme: Theme;
  /**
   * Whether the page content — the previews a choice changes — has mounted.
   *
   * The sidebar hydrates before the page: a choice made in that window moves
   * the group and the URL while every preview keeps the server's palette, and
   * no later render recovers it. So the choice buttons stay disabled until the
   * content boundary reports itself.
   */
  readonly contentReady: boolean;
  /** Choose a platform. */
  readonly setPlatform: (platform: PlatformName) => void;
  /** Choose a look; `native` keeps the platform's own style. */
  readonly setLook: (look: LookName) => void;
  /** Choose a palette. */
  readonly setMode: (mode: ThemeMode) => void;
  /** Report that the page content the choices act on has mounted. */
  readonly markContentMounted: () => void;
}

const PlatformContext = createContext<PlatformState | null>(null);

/** Put every choice in the address bar without navigating. */
const writeUrl = (
  platform: PlatformName,
  mode: ThemeMode,
  look: LookName,
): void => {
  const url = new URL(window.location.href);
  url.searchParams.set(platformParam, platform);
  url.searchParams.set(modeParam, mode);
  if (look === "native") url.searchParams.delete(lookParam);
  else url.searchParams.set(lookParam, look);
  window.history.replaceState(null, "", url.toString());
};

/** The choice a visit opens with: the URL, then the store, then the browser. */
const opening = (search: string): PreviewChoice => {
  const storage = browserChoiceStorage();
  const signals = browserSignals();
  const omarchy =
    namesOmarchy(readDesktopMarker(storage)) || namesOmarchy(signals.userAgent);

  return openingChoice(
    search,
    readRememberedChoice(storage, {
      platform: detectPlatform(signals),
      look: detectLook(omarchy),
      mode: previewMode,
    }),
  );
};

/**
 * The choice the page's HTML is painted with.
 *
 * Every route is prerendered, so the server cannot know a visitor's saved
 * platform, look or palette: it paints the URL's choice, else the site's own
 * default (macOS, the native look, the dark palette). Reading the store in the
 * first render — which this used to do, to "open on the visitor's platform" —
 * made the client disagree with that HTML on every page for a returning visitor,
 * which is React's hydration-text mismatch: one console error per page. The
 * effect below adopts the remembered choice immediately after mount, so the
 * switch still opens on the visitor's platform; only the first frame is the
 * server's.
 */
const painted = (search: string): PreviewChoice =>
  openingChoice(search, {
    platform: "darwin",
    look: detectLook(false),
    mode: previewMode,
  });

/** Provides the platform, palette and look every preview on the page renders. */
export function PlatformProvider({ children }: { children: ReactNode }) {
  const search = useRouterState({
    select: (state) => state.location.searchStr,
  });
  const [choice, setChoice] = useState<PreviewChoice>(() => painted(search));
  // A choice made before the page content hydrates would repaint the switch and
  // the URL while every preview kept the server's palette, so the boundary
  // below the switch reports when there is something to repaint.
  const [contentReady, setContentReady] = useState(false);
  const markContentMounted = useCallback(() => setContentReady(true), []);

  // The URL is the source of truth: a shared link carries every choice, and a
  // navigation that drops a parameter restores the remembered one and puts it
  // back, so the address bar always says what is showing.
  useEffect(() => {
    const storage = browserChoiceStorage();
    const next = opening(search);

    setChoice(next);
    writeRememberedChoice(storage, next);
    if (
      platformFromSearch(search) === undefined ||
      lookFromSearch(search) === undefined ||
      modeFromSearch(search) === undefined
    )
      writeUrl(next.platform, next.mode, next.look);
  }, [search]);

  const choose = useCallback((next: PreviewChoice) => {
    setChoice(next);
    writeRememberedChoice(browserChoiceStorage(), next);
    writeUrl(next.platform, next.mode, next.look);
  }, []);

  const { look, mode, platform } = choice;
  const theme = useMemo(
    () => resolvePlatformTheme(platform, mode, look),
    [platform, mode, look],
  );
  const value = useMemo<PlatformState>(
    () => ({
      ...choice,
      theme,
      contentReady,
      markContentMounted,
      setPlatform: (next) => choose(choosingPlatform(choice, next)),
      setLook: (next) => choose({ ...choice, look: next }),
      setMode: (next) => choose({ ...choice, mode: next }),
    }),
    [choice, theme, choose, contentReady, markContentMounted],
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

/** The switch's markup, given the state it reads — so the gate is testable. */
export function PlatformSwitch({
  mode,
  platform,
  theme,
  setMode,
  setPlatform,
}: Pick<
  PlatformState,
  "mode" | "platform" | "theme" | "setMode" | "setPlatform"
>) {
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
      <p className="gx-platform-title">Palette</p>
      <ChoiceGroup
        choices={modeOrder.map((option) => ({
          value: option,
          label: modeLabel(option),
        }))}
        label="Preview palette"
        onSelect={setMode}
        selected={mode}
      />
      <p className="gx-platform-meta">
        {theme.name} · {theme.typography.mono}
      </p>
    </div>
  );
}

/**
 * The switch itself: the platforms the library names, the palette the previews
 * paint, and the theme they resolve to.
 */
export function PlatformToggle() {
  return <PlatformSwitch {...usePlatform()} />;
}

/**
 * Reports that the content after it has mounted, so the switch can act on it.
 *
 * A marker rather than a hook on the page: it sits inside the same `Suspense`
 * boundary as the page content and after it, so its effect only runs once there
 * is a preview to repaint. On the server and during hydration it reports
 * nothing, which is why the choice buttons start disabled.
 */
export function ContentMounted() {
  const { markContentMounted } = usePlatform();

  useEffect(markContentMounted, [markContentMounted]);

  return null;
}
