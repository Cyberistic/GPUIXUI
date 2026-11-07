import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import * as Option from "effect/Option";
import { makeZoomStore } from "./store.js";

describe("ZoomStore", () => {
  it.effect("rests with no pointer over the frame", () =>
    Effect.gen(function* () {
      const zoom = yield* makeZoomStore;
      expect(Option.isNone(zoom.local.read())).toBe(true);
    }),
  );

  it.effect("follows a move and returns to rest when the pointer leaves", () =>
    Effect.gen(function* () {
      const zoom = yield* makeZoomStore;
      yield* zoom.follow({ x: 60, y: 120 });
      expect(zoom.local.read()).toEqual(Option.some({ x: 60, y: 120 }));

      yield* zoom.leave;
      expect(Option.isNone(zoom.local.read())).toBe(true);
    }),
  );

  it.effect("keeps the snapshot identity for a repeated point", () =>
    Effect.gen(function* () {
      const zoom = yield* makeZoomStore;
      yield* zoom.follow({ x: 60, y: 120 });
      const held = zoom.local.read();

      yield* zoom.follow({ x: 60, y: 120 });

      expect(zoom.local.read()).toBe(held);
    }),
  );

  it.effect("follows a move to a different point", () =>
    Effect.gen(function* () {
      const zoom = yield* makeZoomStore;
      yield* zoom.follow({ x: 60, y: 120 });
      yield* zoom.follow({ x: 61, y: 120 });

      expect(zoom.local.read()).toEqual(Option.some({ x: 61, y: 120 }));
    }),
  );

  it.effect("keeps the resting snapshot for a leave with no pointer", () =>
    Effect.gen(function* () {
      const zoom = yield* makeZoomStore;
      const resting = zoom.local.read();
      yield* zoom.leave;

      expect(zoom.local.read()).toBe(resting);
    }),
  );
});
