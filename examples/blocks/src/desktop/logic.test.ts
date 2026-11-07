import { describe, expect, it } from "vitest";
import {
  active,
  closeMenu,
  raise,
  toggleMenu,
  type DesktopState,
} from "./logic.js";

const start: DesktopState = { order: ["explorer", "license"], menuOpen: true };

describe("raise", () => {
  it("moves the window to the front once, and closes the menu", () => {
    const next = raise(start, "explorer");
    expect(next.order).toEqual(["license", "explorer"]);
    expect(active(next)).toBe("explorer");
    expect(next.menuOpen).toBe(false);
  });
});

describe("the Start menu", () => {
  it("toggles open and shut, and a close leaves a shut menu shut", () => {
    expect(toggleMenu(start).menuOpen).toBe(false);
    expect(toggleMenu(toggleMenu(start)).menuOpen).toBe(true);
    const shut = closeMenu(start);
    expect(shut.menuOpen).toBe(false);
    expect(closeMenu(shut)).toBe(shut);
  });
});
