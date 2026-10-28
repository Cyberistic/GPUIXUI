import { describe, expect, it, vi } from "vitest";
import { reloadOnPreloadError } from "./preload-recovery";

/**
 * One reload when a route's chunk has gone, and never a loop.
 *
 * Guarded bug class: after a deploy every hashed asset changes, so a tab that
 * loaded the previous build fails every route import until the reader reloads
 * by hand — the error page on each navigation.
 */

const store = (): Storage => {
  const held = new Map<string, string>();
  return {
    get length() {
      return held.size;
    },
    clear: () => held.clear(),
    getItem: (key: string) => held.get(key) ?? null,
    key: (index: number) => [...held.keys()][index] ?? null,
    removeItem: (key: string) => void held.delete(key),
    setItem: (key: string, value: string) => void held.set(key, value),
  };
};

describe("a failed preload", () => {
  it("reloads once and then leaves the error to surface", () => {
    vi.stubGlobal("window", { sessionStorage: store() });
    const reload = vi.fn();

    reloadOnPreloadError(1_000, reload);
    expect(reload).toHaveBeenCalledTimes(1);

    // A second failure inside the window is the deployment's problem.
    reloadOnPreloadError(1_500, reload);
    expect(reload).toHaveBeenCalledTimes(1);

    // A minute later the guard has expired and a reload is allowed again.
    reloadOnPreloadError(62_000, reload);
    expect(reload).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
  });
});
