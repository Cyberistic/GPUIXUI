/**
 * The sidebar's open state, persisted the way shadcn's cookie persists it.
 *
 * shadcn writes `sidebar_state` to `document.cookie` with a seven-day lifetime
 * and expects the application to read it back on the next request. GPUix
 * 0.11.0 has no DOM and no cookie jar, so the persistence is a seam: the
 * default is an in-process jar with the same key and lifetime (a remount keeps
 * the state), and an application that wants it across launches hands
 * `SidebarProvider` a preference backed by its own settings store.
 *
 * The jar is module state on purpose. A cookie jar is process state outside any
 * React tree; putting it in a layer would scope it to the provider that built
 * the layer, which is exactly the remount the state has to outlive.
 */

import { Effect } from "effect";
import * as Clock from "effect/Clock";
import * as Duration from "effect/Duration";
import * as Option from "effect/Option";

/** The key shadcn writes. */
export const SIDEBAR_STATE_KEY = "sidebar_state";

/** shadcn's `max-age` for the cookie: seven days. */
export const SIDEBAR_STATE_MAX_AGE: Duration.Duration = Duration.days(7);

/** Where an open state is read from and written to. */
export interface SidebarPreference {
  /** The stored state, or `None` when nothing was stored or it expired. */
  readonly read: Effect.Effect<Option.Option<boolean>>;
  /** Store `open` for {@link SIDEBAR_STATE_MAX_AGE}. */
  readonly write: (open: boolean) => Effect.Effect<void>;
}

interface Entry {
  readonly open: boolean;
  readonly expiresAt: number;
}

const jar = new Map<string, Entry>();

/**
 * The default preference: shadcn's cookie, in process memory.
 *
 * The jar is keyed by {@link SIDEBAR_STATE_KEY} and expires on the runtime's
 * clock, so a test that advances the clock sees the same seven-day lifetime a
 * browser would apply.
 */
export const sidebarStateJar = (): SidebarPreference => ({
  read: Effect.gen(function* () {
    const now = yield* Clock.currentTimeMillis;
    const entry = jar.get(SIDEBAR_STATE_KEY);
    if (entry === undefined) return Option.none<boolean>();
    if (entry.expiresAt <= now) {
      yield* Effect.sync(() => jar.delete(SIDEBAR_STATE_KEY));
      return Option.none<boolean>();
    }
    return Option.some(entry.open);
  }),
  write: (open) =>
    Effect.gen(function* () {
      const now = yield* Clock.currentTimeMillis;
      const entry: Entry = {
        open,
        expiresAt: now + Duration.toMillis(SIDEBAR_STATE_MAX_AGE),
      };
      yield* Effect.sync(() => jar.set(SIDEBAR_STATE_KEY, entry));
    }),
});
