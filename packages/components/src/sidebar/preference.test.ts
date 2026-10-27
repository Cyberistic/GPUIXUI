/**
 * The sidebar's cookie: shadcn's key, shadcn's seven-day lifetime.
 *
 * The bug this guards: a preference that never expires and never reads its own
 * write would make a remount look persistent while the cookie contract the
 * component documents is not the one it keeps.
 */

import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import * as Duration from "effect/Duration";
import * as Option from "effect/Option";
import * as TestClock from "effect/testing/TestClock";
import {
  sidebarStateJar,
  SIDEBAR_STATE_KEY,
  SIDEBAR_STATE_MAX_AGE,
} from "./preference.js";

describe("sidebarStateJar", () => {
  it("names shadcn's key and lifetime", () => {
    expect(SIDEBAR_STATE_KEY).toBe("sidebar_state");
    expect(Duration.toDays(SIDEBAR_STATE_MAX_AGE)).toBe(7);
  });

  it.effect("reads back the value it wrote", () =>
    Effect.gen(function* () {
      const jar = sidebarStateJar();
      yield* jar.write(false);
      expect(yield* jar.read).toEqual(Option.some(false));
      yield* jar.write(true);
      expect(yield* jar.read).toEqual(Option.some(true));
    }),
  );

  it.effect("expires on shadcn's seven-day lifetime", () =>
    Effect.gen(function* () {
      const jar = sidebarStateJar();
      yield* jar.write(false);
      yield* TestClock.adjust(Duration.days(6));
      expect(yield* jar.read).toEqual(Option.some(false));
      yield* TestClock.adjust(Duration.days(2));
      expect(yield* jar.read).toEqual(Option.none());
    }),
  );
});
