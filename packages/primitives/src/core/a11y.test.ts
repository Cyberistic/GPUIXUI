/**
 * Accessible names.
 *
 * The bug guarded: a blank `label` reached the runtime as `aria-label=""`,
 * which is an empty name rather than no name — a control announced as "" is
 * not falled back to its content.
 */

import { describe, expect, it } from "vitest";
import { accessibleName } from "./a11y.js";

describe("accessibleName", () => {
  it("publishes a real name, trimmed", () => {
    expect(accessibleName("Save")).toBe("Save");
    expect(accessibleName("  Save  ")).toBe("Save");
  });

  it("omits a blank name so the control can fall back", () => {
    expect(accessibleName("")).toBeUndefined();
    expect(accessibleName(" \t ")).toBeUndefined();
    expect(accessibleName(undefined)).toBeUndefined();
  });
});
