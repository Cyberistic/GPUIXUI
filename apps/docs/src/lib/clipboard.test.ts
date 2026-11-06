import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { writeClipboard } from "./clipboard";

const withClipboard = (clipboard: unknown): void => {
  vi.stubGlobal("navigator", { clipboard });
};

describe("writing to the clipboard", () => {
  it("answers a browser with no clipboard as a failed copy", async () => {
    expect(navigator.clipboard).toBeUndefined();
    await expect(writeClipboard("text")).resolves.toBe(false);
  });

  it("copies the exact text and answers success", async () => {
    const writeText = vi.fn(async () => undefined);
    withClipboard({ writeText });

    await expect(writeClipboard("card recipe")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("card recipe");
    vi.unstubAllGlobals();
  });

  it("answers a refused write as failure, not a rejected click handler", async () => {
    withClipboard({
      writeText: async () => {
        throw new Error("NotAllowedError: the document is not focused");
      },
    });

    await expect(writeClipboard("text")).resolves.toBe(false);
    vi.unstubAllGlobals();
  });

  it("answers a write that throws before it returns a promise", async () => {
    withClipboard({
      writeText: () => {
        throw new Error("SecurityError: not a secure context");
      },
    });

    await expect(writeClipboard("text")).resolves.toBe(false);
    vi.unstubAllGlobals();
  });

  it("is the only clipboard call the copy controls make", () => {
    const sources = [
      "../components/docs/copy-page.tsx",
      "../components/docs/recipe-source.tsx",
    ].map((path) => readFileSync(new URL(path, import.meta.url), "utf8"));

    sources.forEach((source) => {
      expect(source).toContain("writeClipboard");
      expect(source).not.toContain("navigator.clipboard");
    });
  });
});
