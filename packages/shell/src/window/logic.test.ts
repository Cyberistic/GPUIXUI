import { lightTheme, platformTheme } from "@gpuixui/tokens";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  hasTrafficLights,
  moveSelection,
  visibleIds,
  nativeWindowOptions,
  TOOLBAR_HEIGHT,
  toolbarInset,
  TRAFFIC_LIGHT_INSET,
} from "./logic.js";

/**
 * The native window's geometry and the source list's keyboard (plan 722).
 *
 * Bugs guarded: a toolbar that pads 12 points beside no sidebar paints its
 * title under the close button; lights placed at y = 0 sit above the toolbar's
 * line instead of on it; and a macOS window opened without a transparent
 * titlebar stacks the system bar over the app's own.
 */

const mac = platformTheme(lightTheme, "darwin");

describe("the window options", () => {
  it("opens darwin with a transparent titlebar and the theme's vibrant window", () => {
    expect(nativeWindowOptions(mac, "darwin")).toMatchObject({
      titlebarTransparent: true,
      windowBackground: "blurred",
    });
  });

  it("centres the 12-point lights on each toolbar's line", () => {
    expect(nativeWindowOptions(mac, "darwin").trafficLightY).toBe(20);
    expect(nativeWindowOptions(mac, "darwin", "compact").trafficLightY).toBe(
      13,
    );
    expect(TOOLBAR_HEIGHT).toEqual({ unified: 52, compact: 38 });
  });

  it("keeps the system bar on every other platform", () => {
    expect(nativeWindowOptions(mac, "win32")).toEqual({});
    expect(nativeWindowOptions(mac, "linux")).toEqual({});
  });

  it("opens an opaque window for a theme without materials", () => {
    expect(nativeWindowOptions(lightTheme, "darwin").windowBackground).toBe(
      "opaque",
    );
  });
});

describe("the lights' box", () => {
  it("is reserved only where the lights float over the toolbar", () => {
    expect(toolbarInset(true)).toBe(TRAFFIC_LIGHT_INSET);
    expect(toolbarInset(false)).toBe(12);
    // Three 12-point lights at 20 points from the edge end at 20 + 36 + 16.
    expect(TRAFFIC_LIGHT_INSET).toBeGreaterThanOrEqual(72);
  });

  it("float only on macOS, and never in a terminal", () => {
    expect(hasTrafficLights("darwin", false)).toBe(true);
    expect(hasTrafficLights("darwin", true)).toBe(false);
    expect(hasTrafficLights("linux", false)).toBe(false);
  });
});

describe("the source list's keyboard", () => {
  const ids = ["inbox", "drafts", "sent"];

  it("steps one row and stops at either end", () => {
    expect(Option.getOrNull(moveSelection(ids, "inbox", "down"))).toBe(
      "drafts",
    );
    expect(Option.getOrNull(moveSelection(ids, "sent", "down"))).toBe("sent");
    expect(Option.getOrNull(moveSelection(ids, "inbox", "up"))).toBe("inbox");
  });

  it("jumps to the first and last row", () => {
    expect(Option.getOrNull(moveSelection(ids, "drafts", "home"))).toBe(
      "inbox",
    );
    expect(Option.getOrNull(moveSelection(ids, "drafts", "end"))).toBe("sent");
  });

  it("selects nothing in an empty list", () => {
    expect(Option.isNone(moveSelection([], "inbox", "down"))).toBe(true);
  });
});

describe("visibleIds", () => {
  const sections = [
    { id: "a", items: [{ id: "one" }, { id: "two" }] },
    { id: "b", items: [{ id: "three" }] },
  ];

  it("lists every row of an open section and none of a folded one", () => {
    expect(visibleIds(sections, new Set())).toEqual(["one", "two", "three"]);
    expect(visibleIds(sections, new Set(["a"]))).toEqual(["three"]);
  });
});
