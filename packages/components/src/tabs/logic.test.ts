/**
 * Tab activation rules.
 *
 * The bug this guards: `activation="manual"` selected a tab as soon as the arrow
 * keys moved focus, so Enter had nothing left to do and every visited panel
 * rendered anyway — manual mode behaved exactly like automatic.
 */

import { describe, expect, it } from "vitest";
import { selectsOnFocus } from "./logic.js";

describe("selectsOnFocus", () => {
  it("selects on focus in automatic mode", () => {
    expect(selectsOnFocus("automatic")).toBe(true);
  });

  it("waits for Enter or Space in manual mode", () => {
    expect(selectsOnFocus("manual")).toBe(false);
  });
});
