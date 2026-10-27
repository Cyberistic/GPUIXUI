/**
 * The decorative field's state, without a renderer.
 *
 * The bugs these guard: a box of the same size writing again on every layout
 * report (a field regenerating its grid for a paint that did not move), and a
 * breath that never turns around — the layer would dim once and stay dim.
 */

import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { makeFieldStore } from "./store.js";

describe("FieldStore", () => {
  it("paints nothing before the first layout", () => {
    const field = makeFieldStore();
    try {
      expect(Option.isNone(field.read().box)).toBe(true);
    } finally {
      field.stop();
    }
  });

  it("records the box it measured", () => {
    const field = makeFieldStore();
    try {
      field.note({ width: 320, height: 180 });

      expect(field.read().box).toEqual(
        Option.some({ width: 320, height: 180 }),
      );
    } finally {
      field.stop();
    }
  });

  it("keeps the snapshot for a box of the same size", () => {
    // The bug this guards: `onLayout` reports after every paint, so a field
    // that published each report regenerated the grid for a box that had not
    // changed.
    const field = makeFieldStore();
    try {
      field.note({ width: 320, height: 180 });
      const held = field.read();

      field.note({ width: 320, height: 180 });

      expect(field.read()).toBe(held);
    } finally {
      field.stop();
    }
  });

  it("regenerates for a box that changed size", () => {
    const field = makeFieldStore();
    try {
      field.note({ width: 320, height: 180 });
      field.note({ width: 360, height: 180 });

      expect(field.read().box).toEqual(
        Option.some({ width: 360, height: 180 }),
      );
    } finally {
      field.stop();
    }
  });

  it("turns the breath around on every landing", () => {
    const field = makeFieldStore();
    try {
      expect(field.read().lit).toBe(false);

      field.breathe();
      expect(field.read().lit).toBe(true);

      field.breathe();
      expect(field.read().lit).toBe(false);
    } finally {
      field.stop();
    }
  });
});
