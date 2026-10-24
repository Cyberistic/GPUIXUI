/**
 * The browser's own store, and the refusal a reader can hand it.
 *
 * Every remembered preference on the site reads through here. A browser with
 * site data blocked throws from the `window.localStorage` getter, and a store
 * with no room throws on write; a preference is not a requirement, so a refusal
 * is the absence of an answer — the switch and the theme editor keep working
 * and simply forget.
 */

/** The part of `Storage` the site's preferences need. */
export interface KeyValueStore {
  readonly getItem: (key: string) => string | null;
  readonly setItem: (key: string, value: string) => void;
  readonly removeItem: (key: string) => void;
}

/** Run a store call, reading a refusal as the absence of an answer. */
export const guarded = <A>(run: () => A): A | undefined => {
  try {
    return run();
  } catch {
    return undefined;
  }
};

/** The browser's store, or `undefined` when it refuses one. */
export const browserStore = (): KeyValueStore | undefined =>
  typeof window === "undefined"
    ? undefined
    : guarded(() => window.localStorage);
