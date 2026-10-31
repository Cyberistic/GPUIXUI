/**
 * AppKit's tooltip wait (plan 724). Bug guarded: a tip on macOS appeared at
 * the web's 300 ms, where AppKit waits about a second of rest; and the wait
 * must stay the runtime's own on every pointer theme.
 */
import { lightTheme, platformTheme } from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";
import { APPKIT_TOOLTIP_DELAY_MS, tooltipDelayFor } from "./Tooltip.js";

describe("the tooltip's wait", () => {
  it("waits AppKit's second on a darwin theme", () => {
    expect(tooltipDelayFor(platformTheme(lightTheme, "darwin"))).toBe(
      APPKIT_TOOLTIP_DELAY_MS,
    );
    expect(APPKIT_TOOLTIP_DELAY_MS).toBe(1000);
  });

  it("leaves the runtime's default on every pointer theme", () => {
    expect(tooltipDelayFor(lightTheme)).toBeUndefined();
    expect(tooltipDelayFor(platformTheme(lightTheme, "win32"))).toBeUndefined();
  });
});
