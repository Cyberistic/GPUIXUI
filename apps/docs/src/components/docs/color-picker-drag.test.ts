/**
 * The color picker preview's drag release rule.
 *
 * The bug this guards: the handler treated `buttons !== 0` as the release, so
 * the first pointer move with the primary button held ended the gesture while
 * the reader was still dragging. `stillHeld` is the inverse and is the only
 * check the preview uses to decide whether a move belongs to the drag.
 */

import { describe, expect, it } from "vitest";
import { stillHeld } from "./color-picker-preview";

describe("stillHeld", () => {
  it("keeps a drag while the primary button is down", () => {
    expect(stillHeld(1)).toBe(true);
  });

  it("ends a drag on the first move with no button held", () => {
    expect(stillHeld(0)).toBe(false);
  });
});
