/**
 * The view swap's decisions, without a renderer.
 *
 * The bugs these guard: a swap that mounts the incoming view before the
 * outgoing one has left (two views in the accessibility tree); a second request
 * during the exit that restarts the window instead of replacing the waiting
 * view; a return to the view still on screen that leaves and remounts the same
 * content; a settle that runs twice and counts two runs; an instant swap that
 * still takes a phase; and frames that travel the wrong way or reach the
 * runtime as `NaN`.
 */

import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  PAGE_TRAVEL,
  finishPage,
  initialPageTransition,
  pageFrames,
  pageTravel,
  requestPage,
  settlePage,
} from "./logic.js";

describe("a view swap's state", () => {
  it("starts at rest on the view it is given", () => {
    expect(initialPageTransition("a")).toEqual({
      shownKey: "a",
      pendingKey: Option.none(),
      phase: "rest",
      run: 0,
    });
  });

  it("leaves the shown view before the next one is mounted", () => {
    const leaving = requestPage(initialPageTransition("a"), "b", false);

    expect(leaving.shownKey).toBe("a");
    expect(leaving.pendingKey).toEqual(Option.some("b"));
    expect(leaving.phase).toBe("leaving");
  });

  it("replaces the waiting view instead of restarting the exit", () => {
    const leaving = requestPage(initialPageTransition("a"), "b", false);
    const retargeted = requestPage(leaving, "c", false);

    expect(retargeted.shownKey).toBe("a");
    expect(retargeted.pendingKey).toEqual(Option.some("c"));
    expect(retargeted.phase).toBe("leaving");
    expect(retargeted.run).toBe(leaving.run);
  });

  it("settles into the waiting view once, and counts one mount", () => {
    const leaving = requestPage(initialPageTransition("a"), "b", false);
    const entering = settlePage(leaving);

    expect(entering.shownKey).toBe("b");
    expect(entering.pendingKey).toEqual(Option.none());
    expect(entering.phase).toBe("entering");
    expect(entering.run).toBe(leaving.run + 1);
    // A late second settle must not mount a second view.
    expect(settlePage(entering)).toBe(entering);
  });

  it("cancels the swap when the reader returns to the view on screen", () => {
    const leaving = requestPage(initialPageTransition("a"), "b", false);
    const returning = requestPage(leaving, "a", false);

    expect(returning.shownKey).toBe("a");
    expect(returning.pendingKey).toEqual(Option.none());
    expect(returning.phase).toBe("entering");
    expect(returning.run).toBe(leaving.run);
  });

  it("swaps in the frame it changes when told to", () => {
    const instant = requestPage(initialPageTransition("a"), "b", true);

    expect(instant).toEqual({
      shownKey: "b",
      pendingKey: Option.none(),
      phase: "rest",
      run: 1,
    });
    // The same key is not a new view, even when instant.
    expect(requestPage(instant, "b", true)).toBe(instant);
  });

  it("marks the arrival as home, and nothing else", () => {
    const entering = settlePage(
      requestPage(initialPageTransition("a"), "b", false),
    );
    const rest = finishPage(entering);

    expect(rest.phase).toBe("rest");
    expect(finishPage(rest)).toBe(rest);
  });
});

describe("the travel between two views", () => {
  it("leaves toward the edge the reader came from, forward", () => {
    expect(pageFrames("forward", 12)).toEqual({
      enterFrom: { opacity: 0, left: 12 },
      rest: { opacity: 1, left: 0 },
      exitTo: { opacity: 0, left: -12 },
    });
  });

  it("mirrors both frames when the reader goes back", () => {
    expect(pageFrames("back", 12)).toEqual({
      enterFrom: { opacity: 0, left: -12 },
      rest: { opacity: 1, left: 0 },
      exitTo: { opacity: 0, left: 12 },
    });
  });

  it("travels forward for a direction it does not name", () => {
    // A stored `direction` is not type-checked: `Match.exhaustive` threw out of
    // the render for a name the union does not carry, so a persisted direction
    // took the whole region down with it. The house direction is `forward`.
    expect(pageFrames("sideways", 12)).toEqual({
      enterFrom: { opacity: 0, left: 12 },
      rest: { opacity: 1, left: 0 },
      exitTo: { opacity: 0, left: -12 },
    });
  });

  it("refuses a distance the renderer could not paint", () => {
    expect(pageTravel(Number.NaN)).toBe(PAGE_TRAVEL);
    expect(pageTravel(Number.POSITIVE_INFINITY)).toBe(PAGE_TRAVEL);
    expect(pageTravel(0)).toBe(PAGE_TRAVEL);
    expect(pageTravel(-4)).toBe(PAGE_TRAVEL);
    expect(pageTravel(10.6)).toBe(11);
  });
});
