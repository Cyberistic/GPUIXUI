/**
 * The toggle group's selection rule.
 *
 * The bug to guard is a press that reports a change it did not make: a
 * segmented control re-pressing its active item must not produce a new array,
 * or the parent is woken and the field looks dirty for nothing.
 */

import { describe, expect, it } from "vitest";
import { isPressed, nextSelection } from "./toggle-group.js";

describe("nextSelection", () => {
  it("replaces the selection in single mode", () => {
    expect(nextSelection("single", ["left"], "centre")).toStrictEqual([
      "centre",
    ]);
  });

  it("keeps the same array when single mode presses the active item", () => {
    const current = ["left"] as const;
    expect(nextSelection("single", current, "left")).toBe(current);
  });

  it("appends in multiple mode, preserving press order", () => {
    expect(nextSelection("multiple", ["bold"], "italic")).toStrictEqual([
      "bold",
      "italic",
    ]);
  });

  it("removes in multiple mode and leaves the rest pressed", () => {
    expect(
      nextSelection("multiple", ["bold", "italic", "underline"], "italic"),
    ).toStrictEqual(["bold", "underline"]);
  });

  it("keeps a value the options do not contain", () => {
    expect(nextSelection("multiple", ["external"], "bold")).toStrictEqual([
      "external",
      "bold",
    ]);
  });

  it("reports the pressed state of each value", () => {
    expect(isPressed(["bold"], "bold")).toBe(true);
    expect(isPressed(["bold"], "italic")).toBe(false);
  });
});
