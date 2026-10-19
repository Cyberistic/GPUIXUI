/**
 * Guards plan 576's reader-facing half: Theming renders the platform difference
 * from the package instead of restating it, so the page cannot keep saying
 * "type families only" after the tokens workstream ships a full platform style.
 */

import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PlatformStyles, platformStyles } from "./platform-styles";

const theming = readFileSync(
  new URL("../../content/docs/theming.mdx", import.meta.url),
  "utf8",
);

describe("platformStyles", () => {
  it("reads each platform's shipped difference from the package", () => {
    const win32 = platformStyles().find((style) => style.platform === "win32");

    expect(win32?.name).toContain("Windows");
    expect(
      win32?.diffs.find((diff) => diff.label === "Typography")?.detail,
    ).toBe("mono · Consolas");
  });

  it("compares against the default style, not the build host", () => {
    const darwin = platformStyles().find(
      (style) => style.platform === "darwin",
    );

    expect(darwin?.name).toBe("Light · macOS");
    expect(darwin?.diffs.every((diff) => diff.detail === "same")).toBe(true);
  });
});

describe("PlatformStyles", () => {
  it("renders one column per shipped style and the real faces", () => {
    const markup = renderToStaticMarkup(<PlatformStyles />);

    ["macOS", "Linux", "Windows", "Default"].forEach((label) => {
      expect(markup).toContain(label);
    });
    expect(markup).toContain("Consolas");
    expect(markup).toContain("DejaVu Sans Mono");
  });

  it("marks exactly the default column active on the server", () => {
    const markup = renderToStaticMarkup(<PlatformStyles />);

    expect(markup.match(/data-active="true"/g)).toHaveLength(1);
    expect(markup).toMatch(/data-active="true"[^>]*>Default/);
  });
});

describe("theming.mdx", () => {
  it("renders the generated platform table", () => {
    expect(theming).toContain("<PlatformStyles />");
  });

  it("does not restate the shipped difference as prose", () => {
    expect(theming).not.toContain(
      "only value the shipped platform styles change",
    );
    expect(theming).not.toContain(
      "differ in their **type families and theme name**",
    );
  });
});
