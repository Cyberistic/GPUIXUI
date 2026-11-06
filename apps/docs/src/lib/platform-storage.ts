import { browserStore, guarded } from "./browser-storage";
import {
  browserSignals,
  detectLook,
  detectPlatform,
  namesOmarchy,
  parseLook,
  parseMode,
  parsePlatform,
  previewMode,
  type PlatformSignals,
  type PreviewChoice,
} from "./platform";

export interface ChoiceStorage {
  readonly getItem: (key: string) => string | null;
  readonly setItem: (key: string, value: string) => void;
}

export const platformStorageKey = "gpuixui-platform";

export const lookStorageKey = "gpuixui-look";

export const modeStorageKey = "gpuixui-mode";

export const desktopStorageKey = "gpuixui-desktop";

export type RememberedChoice = PreviewChoice;

export const defaultRememberedChoice: RememberedChoice = {
  platform: "default",
  look: "native",
  mode: previewMode,
};

export const browserChoiceStorage = browserStore;

const readKey = (
  storage: ChoiceStorage | undefined,
  key: string,
): string | null =>
  storage === undefined ? null : (guarded(() => storage.getItem(key)) ?? null);

export const readRememberedChoice = (
  storage: ChoiceStorage | undefined,
  fallback: RememberedChoice = defaultRememberedChoice,
): RememberedChoice => ({
  platform:
    parsePlatform(readKey(storage, platformStorageKey)) ?? fallback.platform,
  look: parseLook(readKey(storage, lookStorageKey)) ?? fallback.look,
  mode: parseMode(readKey(storage, modeStorageKey)) ?? fallback.mode,
});

export const openingChoice = (
  storage: ChoiceStorage | undefined,
  signals: PlatformSignals = browserSignals(),
): RememberedChoice => {
  const omarchy =
    namesOmarchy(readDesktopMarker(storage)) || namesOmarchy(signals.userAgent);

  return readRememberedChoice(storage, {
    platform: detectPlatform(signals),
    look: detectLook(omarchy),
    mode: previewMode,
  });
};

export const readDesktopMarker = (
  storage: ChoiceStorage | undefined,
): string | null => readKey(storage, desktopStorageKey);

export const writeRememberedChoice = (
  storage: ChoiceStorage | undefined,
  choice: RememberedChoice,
): void => {
  if (storage === undefined) return;
  guarded(() => storage.setItem(platformStorageKey, choice.platform));
  guarded(() => storage.setItem(lookStorageKey, choice.look));
  guarded(() => storage.setItem(modeStorageKey, choice.mode));
};
