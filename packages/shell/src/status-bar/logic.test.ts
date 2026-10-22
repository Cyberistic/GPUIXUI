/**
 * Status tone → colour role.
 *
 * The bugs these guard: a named tone painted the bar's plain foreground (so the
 * tone never appeared), the default tone was tinted by accident, and two tones
 * resolved to the same readable colour.
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { lightTheme } from "@gpuixui/tokens";
import { statusToneOf, toneForeground } from "./logic.js";

describe("statusToneOf", () => {
  it("maps a named tone to its token role", () => {
    expect(statusToneOf("success")).toEqual(Option.some("success"));
    expect(statusToneOf("warning")).toEqual(Option.some("warning"));
  });

  it("maps the default tone to no role (negative control)", () => {
    expect(statusToneOf("default")).toEqual(Option.none());
  });
});

describe("toneForeground", () => {
  it("changes the foreground role for a named tone", () => {
    expect(toneForeground(lightTheme, "success")).not.toBe(
      lightTheme.colors.foreground,
    );
  });

  it("keeps the bar's foreground for the default tone (negative control)", () => {
    expect(toneForeground(lightTheme, "default")).toBe(
      lightTheme.colors.foreground,
    );
  });

  it("distinguishes destructive from success", () => {
    expect(toneForeground(lightTheme, "destructive")).not.toBe(
      toneForeground(lightTheme, "success"),
    );
  });
});
