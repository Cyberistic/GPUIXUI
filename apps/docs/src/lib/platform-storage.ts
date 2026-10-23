import type { PlatformName } from "@gpuixui/tokens";
import { parseLook, parsePlatform, type LookName } from "./platform";

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

/** Both remembered axes. */
export interface RememberedChoice {
  readonly platform: PlatformName;
  readonly look: LookName;
}

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

/** What `storage` remembers, defaulting and isolating each axis on its own. */
export const readRememberedChoice = (
  storage: ChoiceStorage | undefined,
): RememberedChoice => ({
  platform: parsePlatform(readKey(storage, platformStorageKey)) ?? "default",
  look: parseLook(readKey(storage, lookStorageKey)) ?? "native",
});

/**
 * Remember both choices.
 *
 * `native` is written like any other look: a reader who tries Luna and returns
 * to the platform's own style has made a choice, and the next page must not
 * resurrect Luna from a stale key. Each key is written on its own, so a store
 * that refuses one still keeps the other.
 */
export const writeRememberedChoice = (
  storage: ChoiceStorage | undefined,
  choice: RememberedChoice,
): void => {
  if (storage === undefined) return;
  attempt(() => storage.setItem(platformStorageKey, choice.platform));
  attempt(() => storage.setItem(lookStorageKey, choice.look));
};
