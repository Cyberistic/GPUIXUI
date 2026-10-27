import { platformTheme, themes } from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";
import {
  cssFontStack,
  platformFontStack,
  previewFontStack,
  SYSTEM_FONT_STACK,
} from "./fonts";

describe("the preview font", () => {
  it("starts each platform's stack with that platform's family", () => {
    expect(platformFontStack("win32").startsWith('"Segoe UI"')).toBe(true);
    expect(platformFontStack("linux").startsWith("Ubuntu")).toBe(true);
    expect(platformFontStack("darwin").startsWith("-apple-system")).toBe(true);
    expect(platformFontStack("default")).toBe(SYSTEM_FONT_STACK);
  });

  it("gives a platform theme that platform's family, not the host's", () => {
    // The bug: every platform style names `.SystemUIFont`, which mapped to one
    // macOS-first stack, so switching to Windows left the preview in San
    // Francisco and the switch had no typographic axis on a Mac.
    expect(previewFontStack(platformTheme(themes.dark, "win32"), "win32")).toBe(
      platformFontStack("win32"),
    );
    expect(
      previewFontStack(platformTheme(themes.dark, "darwin"), "darwin"),
    ).not.toBe(platformFontStack("win32"));
  });

  it("leaves an authored family alone", () => {
    const brand = {
      ...themes.dark,
      typography: { ...themes.dark.typography, sans: "Inter" },
    };

    expect(previewFontStack(brand, "win32")).toBe("Inter");
    expect(cssFontStack("Inter")).toBe("Inter");
  });
});
