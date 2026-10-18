import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import { platformNames } from "./platform";
import { movePlatform, platformSteps } from "./platform-toggle-logic";

/**
 * The bug guarded: the arrow keys move the platform to a neighbour the switcher
 * does not visibly order, or a platform is added to `platformNames` and the
 * neighbour table silently keeps its four old entries. The table is the
 * keyboard contract; the list is the rendered order, and they must agree.
 */
const stepFromEvery = (direction: "next" | "previous"): ReadonlyArray<string> =>
  platformNames.map((name) => platformSteps[name][direction]);

describe("platformSteps", () => {
  it("follows the order the switcher renders, forwards", () => {
    expect(stepFromEvery("next")).toEqual(Arr.rotate([...platformNames], -1));
  });

  it("follows the same order backwards", () => {
    expect(stepFromEvery("previous")).toEqual(
      Arr.rotate([...platformNames], 1),
    );
  });

  it("makes every neighbour reversible", () => {
    const unreversible = platformNames.filter(
      (name) =>
        platformSteps[platformSteps[name].next].previous !== name ||
        platformSteps[platformSteps[name].previous].next !== name,
    );
    expect(unreversible).toEqual([]);
  });

  it("covers every platform the switcher renders", () => {
    expect(new Set(Object.keys(platformSteps))).toEqual(new Set(platformNames));
  });
});

describe("movePlatform", () => {
  it("moves on each arrow key, in two directions", () => {
    expect(movePlatform("linux", "ArrowRight")).toBe(
      movePlatform("linux", "ArrowDown"),
    );
    expect(movePlatform("linux", "ArrowLeft")).toBe(
      movePlatform("linux", "ArrowUp"),
    );
    expect(movePlatform("linux", "ArrowRight")).toBe("win32");
    expect(movePlatform("linux", "ArrowLeft")).not.toBe("win32");
  });

  it("wraps at both ends", () => {
    expect(movePlatform("default", "ArrowRight")).toBe("darwin");
    expect(movePlatform("darwin", "ArrowLeft")).toBe("default");
  });

  it("leaves every non-navigation key alone", () => {
    expect(movePlatform("win32", "Enter")).toBeUndefined();
    expect(movePlatform("win32", "Tab")).toBeUndefined();
    expect(movePlatform("win32", " ")).toBeUndefined();
    expect(movePlatform("win32", "k")).toBeUndefined();
    expect(movePlatform("win32", "")).toBeUndefined();
  });
});
