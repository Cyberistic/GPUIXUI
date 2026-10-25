import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { toastStackSlot } from "./demos";

/**
 * The toast preview's stack and hold, as a DOM shim of the native viewport.
 *
 * The collapsed stack is the native one: the newest card is full and the two
 * behind are short, dimmed, inset strips; expanding gives every card its content
 * height and one gap. The pause mirrors the store's `pause`/`resume`: hovering
 * the stack stops every clock, leaving restarts each with the time it had left.
 * The two are wired to the stack's pointer enter/leave, and the enter/exit tween
 * collapses under `prefers-reduced-motion`, which the preview's CSS declares.
 */

const demos = (): string =>
  readFileSync(fileURLToPath(new URL("./demos.tsx", import.meta.url)), "utf8");

const styles = (): string =>
  readFileSync(
    fileURLToPath(new URL("../../styles/demos.css", import.meta.url)),
    "utf8",
  );

describe("toastStackSlot", () => {
  it("rests the newest card and shortens each older card one step", () => {
    expect(toastStackSlot(2, 3, false)).toEqual({
      height: undefined,
      inset: 0,
      opacity: 1,
      interactive: true,
    });
    expect(toastStackSlot(1, 3, false)).toEqual({
      height: 12,
      inset: 8,
      opacity: 0.7,
      interactive: false,
    });
    expect(toastStackSlot(0, 3, false)).toEqual({
      height: 12,
      inset: 16,
      opacity: 0.4,
      interactive: false,
    });
  });

  it("keeps a fourth card out of the collapsed stack", () => {
    expect(toastStackSlot(0, 4, false)).toEqual({
      height: 0,
      inset: 0,
      opacity: 0,
      interactive: false,
    });
  });

  it("gives every card its content height when expanded", () => {
    expect(toastStackSlot(0, 3, true)).toEqual({
      height: undefined,
      inset: 0,
      opacity: 1,
      interactive: true,
    });
  });
});

describe("the toast preview", () => {
  it("unfolds the stack on hover and pauses every clock while held", () => {
    const source = demos();

    expect(source).toContain("toastStackSlot(index, entries.length, hovered)");
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
