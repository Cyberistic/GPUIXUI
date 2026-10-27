/**
 * The decorative field's state, without a renderer.
 *
 * The bugs these guard: a box of the same size writing again on every layout
 * report (a field regenerating its grid for a paint that did not move), and a
 * breath that never turns around — the layer would dim once and stay dim.
 */

import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import * as Option from "effect/Option";
import { makeFieldStore } from "./store.js";

describe("FieldStore", () => {
  it.effect("paints nothing before the first layout", () =>
    Effect.gen(function* () {
      const field = yield* makeFieldStore;
      expect(Option.isNone(field.local.read().box)).toBe(true);
    }),
  );

  it.effect("records the box it measured", () =>
    Effect.gen(function* () {
      const field = yield* makeFieldStore;
      yield* field.note({ width: 320, height: 180 });

      expect(field.local.read().box).toEqual(
        Option.some({ width: 320, height: 180 }),
      );
    }),
  );

  it.effect("keeps the snapshot for a box of the same size", () =>
    Effect.gen(function* () {
      // The bug this guards: `onLayout` reports after every paint, so a field
      // that published each report regenerated the grid for a box that had not
      // changed.
      const field = yield* makeFieldStore;
      yield* field.note({ width: 320, height: 180 });
      const held = field.local.read();

      yield* field.note({ width: 320, height: 180 });

      expect(field.local.read()).toBe(held);
    }),
  );

  it.effect("regenerates for a box that changed size", () =>
    Effect.gen(function* () {
      const field = yield* makeFieldStore;
      yield* field.note({ width: 320, height: 180 });
      yield* field.note({ width: 360, height: 180 });

      expect(field.local.read().box).toEqual(
        Option.some({ width: 360, height: 180 }),
      );
    }),
  );

  it.effect("turns the breath around on every landing", () =>
    Effect.gen(function* () {
      const field = yield* makeFieldStore;
      expect(field.local.read().lit).toBe(false);

      yield* field.breathe;
      expect(field.local.read().lit).toBe(true);

      yield* field.breathe;
      expect(field.local.read().lit).toBe(false);
    }),
  );
});
