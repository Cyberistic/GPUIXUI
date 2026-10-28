import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { toastStackSlot } from "./demos";

/**
 * The toast preview's stack and hold, as a DOM shim of the native viewport.
 *
 * The collapsed stack is the native one: the newest card is full and the two
 * behind are short, inset peeks of the card's own top; expanding gives every
 * card its content height and one gap. A rank changes a card's box and never its
 * paint, which is the flash the dimmed strips painted on every push. The pause
 * mirrors the store's `pause`/`resume`: hovering
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
    expect(toastStackSlot(0, false)).toEqual({
      height: undefined,
      inset: 0,
      interactive: true,
    });
    expect(toastStackSlot(1, false)).toEqual({
      height: 12,
      inset: 8,
      interactive: false,
    });
    expect(toastStackSlot(2, false)).toEqual({
      height: 12,
      inset: 16,
      interactive: false,
    });
  });

  it("keeps a fourth card out of the collapsed stack", () => {
    expect(toastStackSlot(3, false)).toEqual({
      height: 0,
      inset: 0,
      interactive: false,
    });
  });

  it("gives every card its content height when expanded", () => {
    expect(toastStackSlot(0, true)).toEqual({
      height: undefined,
      inset: 0,
      interactive: true,
    });
    expect(toastStackSlot(2, true)).toEqual({
      height: undefined,
      inset: 0,
      interactive: true,
    });
  });
});

describe("the toast preview", () => {
  it("unfolds the stack on hover and pauses every clock while held", () => {
    const source = demos();

    expect(source).toContain("toastStackSlot(rankAt(entries, index), hovered)");
    expect(source).toContain("onMouseEnter={onStackEnter}");
    expect(source).toContain("onMouseLeave={onStackLeave}");
    expect(source).toContain("pauseTimers");
    expect(source).toContain("resumeTimers");
  });

  it("slides in from the right, leaves right, and holds still under reduced motion", () => {
    const css = styles();

    expect(css).toContain("@keyframes gx-toast-in");
    expect(css).toContain("@keyframes gx-toast-out");
    expect(css).toContain("translateX(16px)");
    expect(css).toContain("animation: gx-toast-in 240ms ease-out");
    expect(css).toContain("animation: gx-toast-out 180ms ease-in forwards");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain("animation: none");
  });
});

describe("a card's slot", () => {
  it("carries the measured height, so the peek is a tween and not a cut", () => {
    // Guarded bug: a whole card left its slot at `height: auto`, and CSS cannot
    // interpolate `auto` into the 12px peek the card drops to when the next
    // toast arrives — measured in Chrome, the toast a reader was reading was
    // 78px tall at t+0 and 12px at t+30. The card measures itself and the slot
    // gets that number.
    const source = demos();

    expect(source).toContain("new ResizeObserver(measure)");
    expect(source).toContain(
      "slot.height ?? (natural === 0 ? undefined : natural)",
    );
    expect(source).toContain("leaving || !born ? 0 : settled");
  });

  it("grows into its box and closes to nothing", () => {
    // The native viewport animates `height: 0 → measured` on arrival and
    // `measured → 0` on leave; a browser drawing that painted both in one frame
    // left the stack jumping by a card's height.
    const source = demos();

    expect(source).toContain("requestAnimationFrame(() => setBorn(true))");
    // The slot is the thing that shrinks on the way out, and it must tween.
    expect(styles()).toContain("height 260ms cubic-bezier(0.22, 1, 0.36, 1)");
  });
});
