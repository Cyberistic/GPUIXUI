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

/** What `storage` remembers, defaulting each axis on its own. */
export const readRememberedChoice = (
  storage: ChoiceStorage,
): RememberedChoice => ({
  platform:
    parsePlatform(storage.getItem(platformStorageKey)) ?? ("default" as const),
  look: parseLook(storage.getItem(lookStorageKey)) ?? ("native" as const),
});

/**
 * Remember both choices.
 *
 * `native` is written like any other look: a reader who tries Luna and returns
 * to the platform's own style has made a choice, and the next page must not
 * resurrect Luna from a stale key.
 */
export const writeRememberedChoice = (
  storage: ChoiceStorage,
  choice: RememberedChoice,
): void => {
  storage.setItem(platformStorageKey, choice.platform);
  storage.setItem(lookStorageKey, choice.look);
};
