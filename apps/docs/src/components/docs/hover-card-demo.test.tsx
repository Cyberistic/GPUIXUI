import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HoverCardDemo } from "./hover-card-demo";

const markup = renderToStaticMarkup(<HoverCardDemo />);

const css = readFileSync(
  new URL("../../styles/demos.css", import.meta.url),
  "utf8",
);

const block = (selector: string): string => {
  const start = css.indexOf(`${selector} {`);
  return start === -1 ? "" : css.slice(start, css.indexOf("}", start));
};

describe("the hover card's drawing", () => {
  it("reserves the card's box inside the preview", () => {
    expect(markup).toContain('class="gx-hovercard-frame"');
    expect(block(".gx-hovercard-frame")).toContain("position: relative");
    expect(block(".gx-hovercard-frame")).toContain("min-height: 176px");
  });

  it("paints the trigger as a plain link, not a toggle", () => {
    expect(markup).toContain('class="gx-hovercard-trigger"');
    const trigger = block(".gx-hovercard-trigger");

    expect(trigger).toContain("background: none");
    expect(trigger).toContain("border: 0");
    expect(trigger).toContain("padding: 0");
    expect(trigger).toContain("text-decoration: underline");
    expect(trigger).not.toContain("border-radius");
  });

  it("moves the card like the native one", () => {
    expect(block(".gx-hovercard")).toContain(
      "animation: gx-hovercard-in 160ms ease-out",
    );
    expect(css).toContain("translate: -50% 4px");
  });
});
