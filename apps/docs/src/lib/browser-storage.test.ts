import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { browserStore, guarded } from "./browser-storage";

describe("the browser store adapter", () => {
  it("answers the absent store outside a browser", () => {
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
    const platform = readFileSync(
      new URL("./platform-storage.ts", import.meta.url),
      "utf8",
    );

    expect(platform).toContain("browser-storage");
    expect(platform).not.toContain("try {");

    expect(platform).not.toMatch(
      /\blocalStorage\.(getItem|setItem|removeItem)/,
    );
  });
});
