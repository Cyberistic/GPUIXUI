import { describe, expect, it } from "vitest";
import {
  isSearchShortcut,
  shouldFocusDestination,
  shouldReturnFocus,
} from "./focus";

/**
 * The bug guarded: Fumadocs renders the palette as a controlled Radix dialog,
 * so Escape closed it onto `<body>` and choosing a result left focus there
 * while a new page rendered (measured 2026-10-18). The site manages focus
 * itself; Escape returns to the opener, a chosen result moves to the new page.
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

describe("shouldFocusDestination", () => {
  const chosen = {
    wasOpen: true,
    open: false,
    dismissedByEscape: false,
    pathChanged: true,
  } as const;

  it("moves focus into the page a chosen result opened", () => {
    expect(shouldFocusDestination(chosen)).toBe(true);
  });

  it("leaves focus alone when Escape dismissed the palette", () => {
    expect(shouldFocusDestination({ ...chosen, dismissedByEscape: true })).toBe(
      false,
    );
  });

  it("leaves focus alone when the result is on the same page", () => {
    expect(shouldFocusDestination({ ...chosen, pathChanged: false })).toBe(
      false,
    );
  });

  it("never acts when no palette was open", () => {
    expect(shouldFocusDestination({ ...chosen, wasOpen: false })).toBe(false);
  });
});
