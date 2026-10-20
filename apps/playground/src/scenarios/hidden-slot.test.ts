/**
 * Guards the hidden-surface recipe a tabbed pane, a carousel slide and a
 * multi-step form copy.
 *
 * The bug being guarded: the recipe is two independent mechanisms, and the
 * records used to state it as one sentence. A slot that hides but still takes
 * the press (or paints but is pointer-transparent) must be named, not merely
 * "not the recipe", so a consumer can fix the half it dropped.
 */
import { describe, expect, it } from "vitest";
import { hiddenSlot, slotProblems } from "./hidden-slot.js";

describe("hiddenSlot", () => {
  it("hides an inactive slot and keeps it out of the hit path", () => {
    expect(slotProblems(hiddenSlot(false), false)).toEqual([]);
    expect(hiddenSlot(false)).toMatchObject({
      position: "absolute",
      visibility: "hidden",
      pointerEvents: "none",
    });
  });

  it("paints an active slot and lets it take hits", () => {
    expect(slotProblems(hiddenSlot(true), true)).toEqual([]);
    expect(hiddenSlot(true)).toMatchObject({
      visibility: "visible",
      pointerEvents: "auto",
    });
  });

  it("names the half a slot dropped", () => {
    const visible = { ...hiddenSlot(false), visibility: "visible" as const };
    const clickable = { ...hiddenSlot(false), pointerEvents: "auto" as const };
    expect(slotProblems(visible, false)).toEqual([
      "an inactive slot must be hidden",
    ]);
    expect(slotProblems(clickable, false)).toEqual([
      "an inactive slot must not take hits",
    ]);
  });
});
