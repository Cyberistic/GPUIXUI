/**
 * The copy action's decisions, without a renderer.
 *
 * The bugs these guard: an icon-only control whose name goes blank because a
 * caller threaded `""` through (a reader hears an unnamed button); a glyph that
 * disagrees with the name it sits beside; and an acknowledgement window that
 * cannot run — a zero or `NaN` clears in the press frame, and an infinite one
 * paints a confirmation forever.
 */

import { describe, expect, it } from "vitest";
import {
  COPY_ACKNOWLEDGEMENT_MS,
  acknowledgementWindow,
  copyButtonIcon,
  copyButtonLabel,
} from "./logic.js";

describe("copy button labels", () => {
  it("names the press at rest and the acknowledgement after it", () => {
    expect(copyButtonLabel(false)).toBe("Copy");
    expect(copyButtonLabel(true)).toBe("Copied");
  });

  it("takes a caller's names and falls back for a blank one", () => {
    expect(copyButtonLabel(false, { label: "Copy the token" })).toBe(
      "Copy the token",
    );
    expect(copyButtonLabel(true, { copiedLabel: "Token copied" })).toBe(
      "Token copied",
    );
    expect(copyButtonLabel(false, { label: "  " })).toBe("Copy");
    expect(copyButtonLabel(true, { copiedLabel: "" })).toBe("Copied");
  });

  it("swaps the glyph with the name", () => {
    expect(copyButtonIcon(false)).toBe("copy");
    expect(copyButtonIcon(true)).toBe("check");
  });
});

describe("the acknowledgement window", () => {
  it("uses the house window when none is given", () => {
    expect(acknowledgementWindow()).toBe(COPY_ACKNOWLEDGEMENT_MS);
  });

  it("refuses a window that cannot run", () => {
    expect(acknowledgementWindow(0)).toBe(COPY_ACKNOWLEDGEMENT_MS);
    expect(acknowledgementWindow(-1)).toBe(COPY_ACKNOWLEDGEMENT_MS);
    expect(acknowledgementWindow(Number.NaN)).toBe(COPY_ACKNOWLEDGEMENT_MS);
    expect(acknowledgementWindow(Number.POSITIVE_INFINITY)).toBe(
      COPY_ACKNOWLEDGEMENT_MS,
    );
  });

  it("keeps a positive window the caller chose", () => {
    expect(acknowledgementWindow(40)).toBe(40);
  });
});
