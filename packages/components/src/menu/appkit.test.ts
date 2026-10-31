/**
 * An AppKit menu's highlight (plan 724). Bug guarded: on macOS a highlighted
 * menu row painted the web's grey `hover` wash; AppKit paints the accent with
 * the accent's ink — on a destructive row too — and follows the pointer.
 */
import { lightTheme, platformTheme } from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";
import { menuRowStyle } from "./item.js";

const mac = platformTheme(lightTheme, "darwin");
const row = { tone: "default", active: true, disabled: false } as const;

describe("an AppKit menu row", () => {
  it("highlights in the accent with the accent's ink", () => {
    const style = menuRowStyle(mac, row);
    expect(style?.backgroundColor).toBe(mac.colors.primary);
    expect(style?.color).toBe(mac.colors.primaryForeground);
    expect(style?.hover?.backgroundColor).toBe(mac.colors.primary);
  });

  it("paints a highlighted destructive row in the accent's ink", () => {
    // Red ink on the accent fill is a pair no floor measures; AppKit paints
    // every highlighted row's text in the accent's own ink.
    expect(menuRowStyle(mac, { ...row, tone: "destructive" })?.color).toBe(
      mac.colors.primaryForeground,
    );
    expect(
      menuRowStyle(mac, { ...row, tone: "destructive", active: false })?.color,
    ).not.toBe(mac.colors.primaryForeground);
  });

  it("keeps the hover wash for a pointer theme", () => {
    expect(menuRowStyle(lightTheme, row)?.backgroundColor).toBe(
      lightTheme.colors.hover,
    );
  });
});
