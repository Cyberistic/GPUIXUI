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

/**
 * The platform switch has two halves. The URL is the shareable one and is tested
 * with the query helpers; local storage is what keeps a reader's choice while
 * they navigate from one component page to the next, and nothing held it. A
 * renamed key or a default written over a real choice would silently reset every
 * preview to the identity.
 *
 * The store itself can refuse: a browser with site data blocked throws from the
 * `window.localStorage` getter, and a store with no room throws on write. The
 * switch used to read `window.localStorage` inside its mount effect, so such a
 * reader lost every preview page to a `SecurityError` rather than a forgotten
 * preference; these cases hold the adapter that turns a refusal into absence.
 */

/** A `Storage` stand-in, so the rule is testable without a browser. */
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
    // A value written by an older build must not reset the other choice, and a
    // missing key must not throw.
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
    // A reader who chose a platform and a look before the palette axis existed
    // has no mode key at all: the switch must open on `previewMode`, not on
    // whatever the first render guessed, and must keep the two axes it does
    // have.
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
    // The old Luna choice must not survive a deliberate `native`.
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
    expect(switchSource).toContain("readRememberedChoice(storage)");
    expect(switchSource).toContain("writeRememberedChoice(storage");
    // The raw property is the call that throws when a browser blocks site
    // data, so the switch must not go near it.
    expect(switchSource).not.toContain("window.localStorage");
    // A key written inline would bypass the parse and the both-axes rule.
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
    // No store at all is the same refusal, and is also how the adapter answers
    // outside a browser (the node environment this suite runs in).
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

    // One refused key must not stop the others from being remembered.
    expect(values.get(platformStorageKey)).toBeUndefined();
    expect(values.get(lookStorageKey)).toBe("luna");
    expect(values.get(modeStorageKey)).toBe("light");
  });

  it("reaches the browser store only through a guarded read", () => {
    // The node environment has no `window` at all.
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

  it("is the refusal the theming page promises", () => {
    // The page a reader checks before trusting the switch: its sentence names
    // the browser refusing the store and what still works, so the prose cannot
    // outlive the adapter that makes it true.
    const page = readRepo("apps/docs/content/docs/theming.mdx").replace(
      /\s+/g,
      " ",
    );

    expect(page).toContain("refuses site storage");
    expect(page).toContain("keeps the URL's choice and the identity");
    expect(page).toContain("does not remember the choice");
  });
});
