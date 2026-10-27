/**
 * The zoom's pointer store, without a renderer.
 *
 * The bugs these guard: a held pointer re-rendering the frame on every move it
 * emits for the same point, and a leave that clears a pointer the frame never
 * had — either one repaints a picture the reader did not move.
 */

import { Option } from "effect";
import { describe, expect, it } from "vitest";
import { makeZoomStore } from "./store.js";

describe("ZoomStore", () => {
  it("rests with no pointer over the frame", () => {
    const zoom = makeZoomStore();
    try {
      expect(Option.isNone(zoom.read())).toBe(true);
    } finally {
      zoom.stop();
    }
  });

  it("follows a move and returns to rest when the pointer leaves", () => {
    const zoom = makeZoomStore();
    try {
      zoom.follow({ x: 60, y: 120 });
      expect(zoom.read()).toEqual(Option.some({ x: 60, y: 120 }));

      zoom.leave();
      expect(Option.isNone(zoom.read())).toBe(true);
    } finally {
      zoom.stop();
    }
  });

  it("keeps the snapshot identity for a repeated point", () => {
    // The bug this guards: a held pointer emits a move per frame, so a store
    // that published every reading re-rendered the frame sixty times a second
    // for a picture that had not moved.
    const zoom = makeZoomStore();
    try {
      zoom.follow({ x: 60, y: 120 });
      const held = zoom.read();

      zoom.follow({ x: 60, y: 120 });

      expect(zoom.read()).toBe(held);
    } finally {
      zoom.stop();
    }
  });

  it("follows a move to a different point", () => {
    const zoom = makeZoomStore();
    try {
      zoom.follow({ x: 60, y: 120 });
      zoom.follow({ x: 61, y: 120 });

      expect(zoom.read()).toEqual(Option.some({ x: 61, y: 120 }));
    } finally {
      zoom.stop();
    }
  });

  it("keeps the resting snapshot for a leave with no pointer", () => {
    const zoom = makeZoomStore();
    try {
      const resting = zoom.read();
      zoom.leave();

      expect(zoom.read()).toBe(resting);
    } finally {
      zoom.stop();
    }
  });
});
