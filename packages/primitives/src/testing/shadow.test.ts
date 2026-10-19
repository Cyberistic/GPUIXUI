/**
 * The one rule that tells a focus ring from elevation (plan `585`).
 *
 * A field's recipe carries `shadow-xs`, so a resting field paints a shadow and
 * a test may no longer read "a shadow exists" as "focused". This case pins the
 * predicate the runtime suites use to ask the question correctly.
 */

import { describe, expect, it } from "vitest";
import { elevationShadow, focusRing } from "@gpuixui/tokens";
import { testTheme } from "../core/testing/theme.fixture.js";
import { isFocusRing } from "./shadow.js";

describe("isFocusRing", () => {
  it("tells a ring from an elevation by its spread", () => {
    expect(isFocusRing(focusRing(testTheme).boxShadow)).toBe(true);
    expect(isFocusRing(elevationShadow(testTheme, "sm"))).toBe(false);
    expect(isFocusRing(elevationShadow(testTheme, "md"))).toBe(false);
    expect(isFocusRing(undefined)).toBe(false);
  });
});
