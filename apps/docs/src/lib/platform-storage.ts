import {
  parseLook,
  parseMode,
  parsePlatform,
  previewMode,
  type PreviewChoice,
} from "./platform";

/**
 * The choice a reader made on the platform switch, remembered between pages.
 *
 * The URL is the shareable half: a link carries `?platform=` and `?look=`. Local
 * storage is the navigation half, so moving from one component page to the next
 * does not reset the switch. Both halves are parsed by the same rules — a stored
 * value written by an older build must fall back per axis, not reset the other
 * choice or throw on read.
 *
 * A browser may also refuse the store outright: a reader who blocks site data
 * gets a `SecurityError` from the `window.localStorage` getter, and one who
 * allows it gets a `QuotaExceededError` on write when there is no room. The
 * switch is a preference, not a requirement, so this module is the one adapter
 * that turns a refusal into absence: the switch then shows the URL's choice (or
 * the identity) and simply does not remember it.
 */

/** The part of `Storage` this module needs, so a test can stand in for it. */
export interface ChoiceStorage {
  readonly getItem: (key: string) => string | null;
  readonly setItem: (key: string, value: string) => void;
}

/** Where the chosen platform is remembered between visits. */
export const platformStorageKey = "gpuixui-platform";

/** Where the chosen look is remembered between visits. */
export const lookStorageKey = "gpuixui-look";

/** Where the chosen palette is remembered between visits. */
export const modeStorageKey = "gpuixui-mode";

/** Where a desktop that names itself is remembered, so its look survives a visit. */
export const desktopStorageKey = "gpuixui-desktop";

/** Every remembered axis. */
export type RememberedChoice = PreviewChoice;

/**
 * What a store with nothing to say shows: the switch's own `default` platform,
 * the platform's style and the palette the site opens in.
 */
export const defaultRememberedChoice: RememberedChoice = {
  platform: "default",
  look: "native",
  mode: previewMode,
};

/** Run a storage call, reading a throw as the absence of an answer. */
const attempt = <A>(run: () => A): A | undefined => {
  try {
    return run();
  } catch {
    return undefined;
  }
};

/**
 * The browser's store, or `undefined` when it refuses one.
 *
 * Both the property access and the writes can throw, so the switch reads this
 * once and hands it to the helpers; a reader with site data blocked keeps a
 * working switch that forgets between pages instead of a broken one.
 */
export const browserChoiceStorage = (): ChoiceStorage | undefined =>
  typeof window === "undefined"
    ? undefined
    : attempt(() => window.localStorage);

const readKey = (
  storage: ChoiceStorage | undefined,
  key: string,
): string | null =>
  storage === undefined ? null : (attempt(() => storage.getItem(key)) ?? null);

/**
 * What `storage` remembers, defaulting each axis on its own to `fallback`.
 *
 * The switch passes detection as the fallback, so a missing key means "ask the
 * browser" while a stored key — including a deliberate `default` platform or
 * `native` look — always wins. A value written by an older build falls back per
 * axis rather than resetting the others.
 */
export const readRememberedChoice = (
  storage: ChoiceStorage | undefined,
  fallback: RememberedChoice = defaultRememberedChoice,
): RememberedChoice => ({
  platform:
    parsePlatform(readKey(storage, platformStorageKey)) ?? fallback.platform,
  look: parseLook(readKey(storage, lookStorageKey)) ?? fallback.look,
  mode: parseMode(readKey(storage, modeStorageKey)) ?? fallback.mode,
});

/** The desktop marker `storage` remembers, if it remembers one. */
export const readDesktopMarker = (
  storage: ChoiceStorage | undefined,
): string | null => readKey(storage, desktopStorageKey);

/**
 * Remember every choice.
 *
 * `native` is written like any other look: a reader who tries Luna and returns
 * to the platform's own style has made a choice, and the next page must not
 * resurrect Luna from a stale key. Each key is written on its own, so a store
 * that refuses one still keeps the others.
 */
export const writeRememberedChoice = (
  storage: ChoiceStorage | undefined,
  choice: RememberedChoice,
): void => {
  if (storage === undefined) return;
  attempt(() => storage.setItem(platformStorageKey, choice.platform));
  attempt(() => storage.setItem(lookStorageKey, choice.look));
  attempt(() => storage.setItem(modeStorageKey, choice.mode));
};
