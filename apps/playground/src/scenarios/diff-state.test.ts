/**
 * `diff-state` — the two consumer transitions a controlled `<diff>` needs
 * (plan `648`).
 *
 * Guards the rules the diff viewer recipe depends on: toggling a path twice is
 * the identity, and a preview cap only moves for a positive integer payload.
 * The runtime half (a header click emitting, the element not expanding itself)
 * is measured by `diff-surface`/`live-diff`.
 */
import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { revealMore, togglePath } from "./diff-state.js";

describe("togglePath", () => {
  it("adds an absent path and removes it on the second toggle", () => {
    const once = togglePath(Option.none(), "src/app.ts");
    expect(once).toEqual(["src/app.ts"]);
    expect(togglePath(Option.some(once), "src/app.ts")).toEqual([]);
  });

  it("keeps the other paths in their insertion order", () => {
    expect(togglePath(Option.some(["a", "b", "c"]), "b")).toEqual(["a", "c"]);
    expect(togglePath(Option.some(["a", "b"]), "c")).toEqual(["a", "b", "c"]);
  });
});

describe("revealMore", () => {
  it("raises the cap by the hidden count", () => {
    expect(revealMore(Option.some(3), "7")).toEqual(Option.some(10));
  });

  it("leaves the cap alone for a missing or malformed payload", () => {
    expect(revealMore(Option.none(), "7")).toEqual(Option.none());
    expect(revealMore(Option.some(3), "x")).toEqual(Option.some(3));
    expect(revealMore(Option.some(3), "0")).toEqual(Option.some(3));
    expect(revealMore(Option.some(3), "2.5")).toEqual(Option.some(3));
  });
});
