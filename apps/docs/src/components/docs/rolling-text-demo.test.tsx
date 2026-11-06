import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RollingTextDemo } from "./rolling-text-demo";

const markup = renderToStaticMarkup(<RollingTextDemo />);

const css = readFileSync(
  new URL("../../styles/demos.css", import.meta.url),
  "utf8",
);

const block = (selector: string): string => {
  const start = css.indexOf(`${selector} {`);
  return start === -1 ? "" : css.slice(start, css.indexOf("}", start));
};

const value = (selector: string, property: string): string =>
  new RegExp(`(?:^|[;{\\s])${property}:\\s*([^;]+);`)
    .exec(block(selector))?.[1]
    ?.trim() ?? "";

describe("the rolling-text preview", () => {
  it("renders the value and the control that changes it", () => {
    expect(markup).toContain('class="gx-rolling-line"');
    expect(markup).toContain('class="gx-rolling-value"');
    expect(markup).toContain(">Idle<");
    expect(markup).toContain("Next state");
  });

  it("clips one line of the value, not one line of the page", () => {
    const line = value(".gx-rolling-value", "line-height");
    expect(line).toBe("28px");
    expect(value(".gx-rolling-line", "height")).toBe(line);
  });

  it("holds a line box tall enough for the type it sets", () => {
    const size = Number.parseFloat(value(".gx-rolling-value", "font-size"));
    const height = Number.parseFloat(value(".gx-rolling-line", "height"));
    expect(size).toBe(26);
    expect(height).toBeGreaterThanOrEqual(size);
  });
});
