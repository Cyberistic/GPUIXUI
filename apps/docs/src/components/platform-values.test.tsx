import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PlatformToggle } from "@/platform/platform-toggle";
import { PlatformValues, platformRows } from "./platform-values";

/**
 * Guards plan 420's visible half and plan 509's control contract. The failures
 * being caught: the toggle renders its four labels while the values panel keeps
 * showing the default theme — a control that looks wired but changes nothing —
 * or a second hand-written family table drifting from `@gpuixui/tokens`; and a
 * single-select switcher that announces itself as four independent toggle
 * buttons with four tab stops.
 */
const valueOf = (rows: ReturnType<typeof platformRows>, label: string) =>
  rows.find((row) => row.label === label)?.value;

describe("platformRows", () => {
  it("reads each platform's family from the package", () => {
    expect(valueOf(platformRows("win32"), "Mono face")).toBe("Consolas");
    expect(valueOf(platformRows("linux"), "Mono face")).toBe(
      "DejaVu Sans Mono",
    );
    expect(valueOf(platformRows("darwin"), "Mono face")).toBe("Menlo");
  });

  it("names the platform theme, not the base theme alone", () => {
    expect(valueOf(platformRows("linux"), "Theme name")).toContain("Linux");
  });
});

describe("PlatformToggle", () => {
  it("offers all four styles and marks exactly one as checked", () => {
    const markup = renderToStaticMarkup(<PlatformToggle />);
    expect(markup).toContain("macOS");
    expect(markup).toContain("Linux");
    expect(markup).toContain("Windows");
    expect(markup).toContain("Default");
    expect(markup.match(/aria-checked="true"/g)).toHaveLength(1);
  });

  it("is one radio group with one tab stop", () => {
    const markup = renderToStaticMarkup(<PlatformToggle />);
    expect(markup).toContain('role="radiogroup"');
    expect(markup.match(/role="radio"/g)).toHaveLength(4);
    expect(markup.match(/tabindex="0"/g)).toHaveLength(1);
    expect(markup.match(/tabindex="-1"/g)).toHaveLength(3);
  });
});

describe("PlatformValues", () => {
  it("renders the default platform's package values on the server", () => {
    const markup = renderToStaticMarkup(<PlatformValues />);
    expect(markup).toContain("Default");
    expect(markup).toContain("Menlo");
    expect(markup).toContain("platformTheme");
  });
});
