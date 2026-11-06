import { describe, expect, it, vi } from "vitest";
import { reloadOnPreloadError } from "./preload-recovery";

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

    reloadOnPreloadError(1_500, reload);
    expect(reload).toHaveBeenCalledTimes(1);

    reloadOnPreloadError(62_000, reload);
    expect(reload).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
  });
});
