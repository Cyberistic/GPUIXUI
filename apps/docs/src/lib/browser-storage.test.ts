import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { browserStore, guarded } from "./browser-storage";

/**
 * The one adapter a refused browser store goes through.
 *
 * A reader who blocks site data gets a `SecurityError` from the
 * `window.localStorage` getter, and a store with no room throws on write. The
 * switch that remembers itself — the platform and palette choice — reads this
 * module, so a regression here breaks every preview on the site;
 * `platform-storage.test.ts` holds what it reads and what absence answers.
 */

describe("the browser store adapter", () => {
  it("answers the absent store outside a browser", () => {
    // Node is the environment this suite runs in: no `window`, no store.
    expect(browserStore()).toBeUndefined();
  });

  it("answers the absent store when the property itself refuses", () => {
    vi.stubGlobal(
      "window",
      Object.defineProperty({}, "localStorage", {
        get: () => {
          throw new Error("SecurityError: site data is blocked");
        },
      }),
    );
    expect(browserStore()).toBeUndefined();
    vi.unstubAllGlobals();
  });

  it("hands back the store a browser allows, by identity", () => {
    const store = {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
    };
    vi.stubGlobal("window", { localStorage: store });
    // Identity, not a copy: the caller writes through the browser's own object.
    expect(browserStore()).toBe(store);
    vi.unstubAllGlobals();
  });

  it("reads a refusal inside a call as no answer, keeping a real answer", () => {
    expect(guarded(() => 3)).toBe(3);
    expect(guarded(() => "stored")).toBe("stored");
    expect(
      guarded(() => {
        throw new Error("SecurityError");
      }),
    ).toBeUndefined();
  });

  it("is the guard the remembered preference reads through", () => {
    // The module may not grow its own try/catch: a second adapter would let
    // one reader forget how a refusal is answered while the other still worked.
    const platform = readFileSync(
      new URL("./platform-storage.ts", import.meta.url),
      "utf8",
    );

    expect(platform).toContain("browser-storage");
    expect(platform).not.toContain("try {");
    // The JSDoc may name the property; the code may not call it.
    expect(platform).not.toMatch(
      /\blocalStorage\.(getItem|setItem|removeItem)/,
    );
  });
});
