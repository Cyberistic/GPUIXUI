import { describe, expect, it } from "vitest";
import { nextTheme } from "./theme-toggle";

/**
 * The bug this guards: a compact switch that derives its next mode from a
 * hard-coded `"dark"` would leave a dark page dark (a press that does nothing),
 * and one that maps an unresolved store to `"light"` would do the same on a
 * light page before hydration. next-themes publishes `resolvedTheme` as
 * `"light" | "dark" | undefined`, so every branch is reachable.
 */
describe("nextTheme", () => {
  it("turns a dark page light", () => {
    expect(nextTheme("dark")).toBe("light");
  });

  it("turns a light page dark", () => {
    expect(nextTheme("light")).toBe("dark");
  });

  it("treats an unresolved store as light, so the first press changes the page", () => {
    expect(nextTheme(undefined)).toBe("dark");
    expect(nextTheme("system")).toBe("dark");
  });
});
