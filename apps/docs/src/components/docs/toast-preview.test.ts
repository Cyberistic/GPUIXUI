import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { toastFanLift } from "./demos";

/**
 * The toast preview's fan and hold, as a DOM shim of the native viewport.
 *
 * The hover fan is the sonner rule: the newest card rests still and each older
 * card lifts one step further, so hovering widens the gap between neighbours.
 * The pause mirrors the store's `pause`/`resume`: hovering the stack stops every
 * clock, leaving restarts each with the time it had left. The two are wired to
 * the stack's pointer enter/leave, and the enter/exit tween collapses under
 * `prefers-reduced-motion`, which the preview's CSS declares.
 */

const demos = (): string =>
  readFileSync(fileURLToPath(new URL("./demos.tsx", import.meta.url)), "utf8");

const styles = (): string =>
  readFileSync(
    fileURLToPath(new URL("../../styles/demos.css", import.meta.url)),
    "utf8",
  );

describe("toastFanLift", () => {
  it("rests the newest card and lifts each older card one step further", () => {
    expect(toastFanLift(0, 3)).toBe(16);
    expect(toastFanLift(1, 3)).toBe(8);
    expect(toastFanLift(2, 3)).toBe(0);
  });

  it("does not fan a single card", () => {
    expect(toastFanLift(0, 1)).toBe(0);
    expect(toastFanLift(0, 0)).toBe(0);
  });

  it("widens the gap between neighbours by exactly one step", () => {
    expect(toastFanLift(0, 4) - toastFanLift(1, 4)).toBe(8);
    expect(toastFanLift(1, 4) - toastFanLift(2, 4)).toBe(8);
  });
});

describe("the toast preview", () => {
  it("fans the stack on hover and pauses every clock while held", () => {
    const source = demos();

    // The fan applies the rule to each card, gated on the stack being hovered.
    expect(source).toContain("toastFanLift(index, entries.length)");
    // The hold mirrors the store's pause/resume, wired to the stack's enter/leave.
    expect(source).toContain("onMouseEnter={onStackEnter}");
    expect(source).toContain("onMouseLeave={onStackLeave}");
    expect(source).toContain("pauseTimers");
    expect(source).toContain("resumeTimers");
  });

  it("rises on entry, leaves right, and holds still under reduced motion", () => {
    const css = styles();

    expect(css).toContain("@keyframes gx-toast-in");
    expect(css).toContain("translateY(16px)");
    expect(css).toContain("@keyframes gx-toast-out");
    expect(css).toContain("translateX(16px)");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain("animation: none");
  });
});
