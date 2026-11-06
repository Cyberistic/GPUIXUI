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
