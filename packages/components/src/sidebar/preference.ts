import { Effect } from "effect";
import * as Clock from "effect/Clock";
import * as Duration from "effect/Duration";
import * as Option from "effect/Option";

export const SIDEBAR_STATE_KEY = "sidebar_state";

export const SIDEBAR_STATE_MAX_AGE: Duration.Duration = Duration.days(7);

export interface SidebarPreference {
  readonly read: Effect.Effect<Option.Option<boolean>>;

  readonly write: (open: boolean) => Effect.Effect<void>;
}

interface Entry {
  readonly open: boolean;
  readonly expiresAt: number;
}

const jar = new Map<string, Entry>();

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
