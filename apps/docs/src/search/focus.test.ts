import { describe, expect, it } from "vitest";
import { isSearchShortcut, shouldReturnFocus } from "./focus";

/**
 * The bug guarded: Fumadocs renders the palette as a controlled Radix dialog,
 * so Escape closed it onto `<body>` (measured 2026-10-18). The site restores
 * focus itself; these rules must also say "no" to a close caused by choosing a
 * result, or the reader is yanked back to the trigger after navigating.
 */

describe("isSearchShortcut", () => {
  it("matches the command and control forms, case-insensitively", () => {
    expect(isSearchShortcut({ key: "k", metaKey: true, ctrlKey: false })).toBe(
      true,
    );
    expect(isSearchShortcut({ key: "k", metaKey: false, ctrlKey: true })).toBe(
      true,
    );
    expect(isSearchShortcut({ key: "K", metaKey: true, ctrlKey: false })).toBe(
      true,
    );
  });

  it("does not treat a plain keystroke as the shortcut", () => {
    expect(isSearchShortcut({ key: "k", metaKey: false, ctrlKey: false })).toBe(
      false,
    );
    expect(isSearchShortcut({ key: "s", metaKey: true, ctrlKey: false })).toBe(
      false,
    );
  });
});

describe("shouldReturnFocus", () => {
  const escaped = {
    wasOpen: true,
    open: false,
    dismissedByEscape: true,
  } as const;

  it("returns focus only after Escape closed an open palette", () => {
    expect(shouldReturnFocus(escaped)).toBe(true);
  });

  it("stays out of the way when the palette is still open", () => {
    expect(shouldReturnFocus({ ...escaped, open: true })).toBe(false);
  });

  it("stays out of the way when no palette was open", () => {
    expect(shouldReturnFocus({ ...escaped, wasOpen: false })).toBe(false);
  });

  it("does not pull focus back after a result was chosen", () => {
    expect(shouldReturnFocus({ ...escaped, dismissedByEscape: false })).toBe(
      false,
    );
  });
});
