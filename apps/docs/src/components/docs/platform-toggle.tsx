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
  choosingPlatform,
  modeLabel,
  modeOrder,
  platformLabel,
  platformOrder,
  resolvePlatformTheme,
  type LookName,
  type PreviewChoice,
} from "../../lib/platform";
import {
  browserChoiceStorage,
  openingChoice,
  writeRememberedChoice,
} from "../../lib/platform-storage";

interface PlatformState {
  readonly platform: PlatformName;

  readonly look: LookName;

  readonly mode: ThemeMode;

  readonly theme: Theme;

  readonly contentReady: boolean;

  readonly setPlatform: (platform: PlatformName) => void;

  readonly setLook: (look: LookName) => void;

  readonly setMode: (mode: ThemeMode) => void;

  readonly markContentMounted: () => void;
}

const PlatformContext = createContext<PlatformState | null>(null);

export function PlatformProvider({ children }: { children: ReactNode }) {
  const [choice, setChoice] = useState<PreviewChoice>(() =>
    openingChoice(browserChoiceStorage()),
  );

  const [contentReady, setContentReady] = useState(false);
  const markContentMounted = useCallback(() => setContentReady(true), []);

  const choose = useCallback((next: PreviewChoice) => {
    setChoice(next);
    writeRememberedChoice(browserChoiceStorage(), next);
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

export function usePlatform(): PlatformState {
  const value = usePlatformOptional();
  if (value === null) {
    throw new Error("usePlatform: no PlatformProvider above this component");
  }
  return value;
}

export function usePlatformOptional(): PlatformState | null {
  return useContext(PlatformContext);
}

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

export function PlatformToggle() {
  return <PlatformSwitch {...usePlatform()} />;
}

export function ContentMounted() {
  const { markContentMounted } = usePlatform();

  useEffect(markContentMounted, [markContentMounted]);

  return null;
}
