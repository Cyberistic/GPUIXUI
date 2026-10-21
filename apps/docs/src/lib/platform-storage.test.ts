import { describe, expect, it } from "vitest";
import { readRepo } from "./doc-snippets.test-util";
import {
  lookStorageKey,
  platformStorageKey,
  readRememberedChoice,
  writeRememberedChoice,
} from "./platform-storage";

/**
 * The platform switch has two halves. The URL is the shareable one and is tested
 * with the query helpers; local storage is what keeps a reader's choice while
 * they navigate from one component page to the next, and nothing held it. A
 * renamed key or a default written over a real choice would silently reset every
 * preview to the identity.
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
    ]);

    expect(readRememberedChoice(storage)).toEqual({
      platform: "win32",
      look: "luna",
    });
  });

  it("defaults each axis on its own when the stored value is unusable", () => {
    // A value written by an older build must not reset the other choice, and a
    // missing key must not throw.
    const storage = fakeStorage([
      [platformStorageKey, "windows"],
      [lookStorageKey, "aero"],
    ]);

    expect(readRememberedChoice(storage)).toEqual({
      platform: "default",
      look: "aero",
    });
    expect(readRememberedChoice(fakeStorage([]))).toEqual({
      platform: "default",
      look: "native",
    });
  });

  it("writes both axes, including a return to the platform's own style", () => {
    const storage = fakeStorage([[lookStorageKey, "luna"]]);

    writeRememberedChoice(storage, { platform: "darwin", look: "native" });

    expect(storage.values.get(platformStorageKey)).toBe("darwin");
    // The old Luna choice must not survive a deliberate `native`.
    expect(storage.values.get(lookStorageKey)).toBe("native");
    expect(readRememberedChoice(storage)).toEqual({
      platform: "darwin",
      look: "native",
    });
  });

  it("is how the switch remembers, not a copy beside it", () => {
    const switchSource = readRepo(
      "apps/docs/src/components/docs/platform-toggle.tsx",
    );

    expect(switchSource).toContain("readRememberedChoice(window.localStorage)");
    expect(switchSource).toContain("writeRememberedChoice(window.localStorage");
    // A key written inline would bypass the parse and the both-axes rule.
    expect(switchSource).not.toContain('"gpuixui-platform"');
    expect(switchSource).not.toContain('"gpuixui-look"');
  });
});
