import { describe, expect, it, vi } from "vitest";
import { readRepo } from "./doc-snippets.test-util";
import { previewMode } from "./platform";
import {
  browserChoiceStorage,
  lookStorageKey,
  modeStorageKey,
  platformStorageKey,
  readRememberedChoice,
  writeRememberedChoice,
  type ChoiceStorage,
} from "./platform-storage";

const fakeStorage = (entries: ReadonlyArray<readonly [string, string]>) => {
  const values = new Map(entries);
  return {
    values,
    getItem: (key: string): string | null => values.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      values.set(key, value);
    },
  };
};

describe("the remembered platform choice", () => {
  it("reads both stored choices", () => {
    const storage = fakeStorage([
      [platformStorageKey, "win32"],
      [lookStorageKey, "luna"],
      [modeStorageKey, "light"],
    ]);

    expect(readRememberedChoice(storage)).toEqual({
      platform: "win32",
      look: "luna",
      mode: "light",
    });
  });

  it("defaults each axis on its own when the stored value is unusable", () => {
    const storage = fakeStorage([
      [platformStorageKey, "windows"],
      [lookStorageKey, "aero"],
      [modeStorageKey, "sepia"],
    ]);

    expect(readRememberedChoice(storage)).toEqual({
      platform: "default",
      look: "aero",
      mode: "dark",
    });
    expect(readRememberedChoice(fakeStorage([]))).toEqual({
      platform: "default",
      look: "native",
      mode: "dark",
    });
  });

  it("opens an older store on the palette the site opens in", () => {
    const storage = fakeStorage([
      [platformStorageKey, "linux"],
      [lookStorageKey, "aero"],
    ]);

    expect(readRememberedChoice(storage)).toEqual({
      platform: "linux",
      look: "aero",
      mode: previewMode,
    });
    expect(previewMode).toBe("dark");
  });

  it("writes every axis, including a return to the platform's own style", () => {
    const storage = fakeStorage([[lookStorageKey, "luna"]]);

    writeRememberedChoice(storage, {
      platform: "darwin",
      look: "native",
      mode: "light",
    });

    expect(storage.values.get(platformStorageKey)).toBe("darwin");

    expect(storage.values.get(lookStorageKey)).toBe("native");
    expect(storage.values.get(modeStorageKey)).toBe("light");
    expect(readRememberedChoice(storage)).toEqual({
      platform: "darwin",
      look: "native",
      mode: "light",
    });
  });

  it("is how the switch remembers, not a copy beside it", () => {
    const switchSource = readRepo(
      "apps/docs/src/components/docs/platform-toggle.tsx",
    );

    expect(switchSource).toContain("browserChoiceStorage()");
    expect(switchSource).toContain("openingChoice(browserChoiceStorage())");
    expect(switchSource).toContain(
      "writeRememberedChoice(browserChoiceStorage()",
    );

    expect(switchSource).not.toContain("window.localStorage");

    expect(switchSource).not.toContain('"gpuixui-platform"');
    expect(switchSource).not.toContain('"gpuixui-look"');
    expect(switchSource).not.toContain('"gpuixui-mode"');
  });

  it("turns a store that refuses every call into the defaults", () => {
    const refused: ChoiceStorage = {
      getItem: () => {
        throw new Error("SecurityError: site data is blocked");
      },
      setItem: () => {
        throw new Error("QuotaExceededError: the store is full");
      },
    };

    expect(readRememberedChoice(refused)).toEqual({
      platform: "default",
      look: "native",
      mode: "dark",
    });
    expect(() =>
      writeRememberedChoice(refused, {
        platform: "win32",
        look: "aero",
        mode: "light",
      }),
    ).not.toThrow();

    expect(readRememberedChoice(undefined)).toEqual({
      platform: "default",
      look: "native",
      mode: "dark",
    });
    expect(() =>
      writeRememberedChoice(undefined, {
        platform: "linux",
        look: "native",
        mode: "light",
      }),
    ).not.toThrow();
  });

  it("keeps the axis a store still answers when the other is refused", () => {
    const values = new Map<string, string>();
    const partial: ChoiceStorage = {
      getItem: (key) => {
        if (key === platformStorageKey) throw new Error("SecurityError");
        return values.get(key) ?? null;
      },
      setItem: (key, value) => {
        if (key === platformStorageKey) throw new Error("QuotaExceededError");
        values.set(key, value);
      },
    };
    values.set(lookStorageKey, "aero");

    expect(readRememberedChoice(partial)).toEqual({
      platform: "default",
      look: "aero",
      mode: "dark",
    });

    writeRememberedChoice(partial, {
      platform: "win32",
      look: "luna",
      mode: "light",
    });

    expect(values.get(platformStorageKey)).toBeUndefined();
    expect(values.get(lookStorageKey)).toBe("luna");
    expect(values.get(modeStorageKey)).toBe("light");
  });

  it("reaches the browser store only through a guarded read", () => {
    expect(browserChoiceStorage()).toBeUndefined();

    vi.stubGlobal(
      "window",
      Object.defineProperty({}, "localStorage", {
        get: () => {
          throw new Error("SecurityError: site data is blocked");
        },
      }),
    );
    expect(browserChoiceStorage()).toBeUndefined();

    const storage = fakeStorage([]);
    vi.stubGlobal("window", { localStorage: storage });
    expect(browserChoiceStorage()).toBe(storage);
    vi.unstubAllGlobals();
  });
});
