/**
 * Hotkey capture.
 *
 * The bugs these guard: a modifier-only press committing a chord, `mod` not
 * adapting to the platform, a Control press on macOS being rewritten to Command,
 * Enter not normalising, and a chord in the wrong modifier order.
 */

import type { EventPayload } from "@gpuix/react";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { acceleratorOf } from "./logic.js";

/** One key event, with the modifiers the suite needs. */
const key = (
  name: string,
  modifiers: Partial<{
    shift: boolean;
    ctrl: boolean;
    alt: boolean;
    cmd: boolean;
  }> = {},
): EventPayload => ({
  elementId: 1,
  eventType: "keyDown",
  key: name,
  modifiers: {
    shift: false,
    ctrl: false,
    alt: false,
    cmd: false,
    ...modifiers,
  },
});

describe("acceleratorOf", () => {
  it("maps the platform modifier to mod", () => {
    expect(acceleratorOf(key("k", { cmd: true }), "darwin")).toEqual(
      Option.some("mod+k"),
    );
    expect(acceleratorOf(key("k", { ctrl: true }), "win32")).toEqual(
      Option.some("mod+k"),
    );
    expect(acceleratorOf(key("k", { ctrl: true }), "linux")).toEqual(
      Option.some("mod+k"),
    );
  });

  it("keeps a deliberate secondary modifier", () => {
    expect(acceleratorOf(key("k", { ctrl: true }), "darwin")).toEqual(
      Option.some("ctrl+k"),
    );
    expect(acceleratorOf(key("k", { cmd: true }), "win32")).toEqual(
      Option.some("cmd+k"),
    );
  });

  it("refuses modifier-only presses", () => {
    expect(acceleratorOf(key("shift", { shift: true }), "darwin")).toEqual(
      Option.none(),
    );
    expect(acceleratorOf(key("meta", { cmd: true }), "darwin")).toEqual(
      Option.none(),
    );
  });

  it("normalises Enter and Space", () => {
    expect(acceleratorOf(key("return"), "darwin")).toEqual(
      Option.some("enter"),
    );
    expect(acceleratorOf(key(" "), "darwin")).toEqual(Option.some("space"));
  });

  it("lower-cases a single character", () => {
    expect(acceleratorOf(key("K", { shift: true }), "darwin")).toEqual(
      Option.some("shift+k"),
    );
  });

  it("orders modifiers mod, secondary, shift, alt", () => {
    expect(
      acceleratorOf(
        key("p", { cmd: true, ctrl: true, shift: true, alt: true }),
        "darwin",
      ),
    ).toEqual(Option.some("mod+ctrl+shift+alt+p"));
    expect(
      acceleratorOf(key("k", { ctrl: true, shift: true }), "darwin"),
    ).toEqual(Option.some("ctrl+shift+k"));
  });

  it("refuses an event without a key", () => {
    expect(
      acceleratorOf({ elementId: 1, eventType: "keyDown" }, "darwin"),
    ).toEqual(Option.none());
  });

  it("captures Shift+F10", () => {
    expect(acceleratorOf(key("f10", { shift: true }), "win32")).toEqual(
      Option.some("shift+f10"),
    );
  });
});
