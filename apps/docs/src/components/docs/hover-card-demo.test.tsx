import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HoverCardDemo } from "./hover-card-demo";

/**
 * The hover card's drawing: it fits its preview, and its trigger reads as a link.
 *
 * The bugs these guard: the absolutely positioned card overflowed the preview's
 * own scroller, so opening it painted a clipped panel; and the trigger was a
 * chip — a padded, filled control box — which reads as a toggle button sitting
 * in a sentence, where shadcn's trigger is an underlined anchor.
 */

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
    // The card is absolute; the frame under it owns the height. Without it the
    // card's 176px travelled out of `.gx-demo`'s scroller and was clipped.
    expect(markup).toContain('class="gx-hovercard-frame"');
    expect(block(".gx-hovercard-frame")).toContain("position: relative");
    expect(block(".gx-hovercard-frame")).toContain("min-height: 176px");
  });

  it("paints the trigger as a plain link, not a toggle", () => {
    expect(markup).toContain('class="gx-hovercard-trigger"');
    const trigger = block(".gx-hovercard-trigger");

    // No control box: no fill, no edge, no padding, no height — the chip the
    // page used to paint.
    expect(trigger).toContain("background: none");
    expect(trigger).toContain("border: 0");
    expect(trigger).toContain("padding: 0");
    expect(trigger).toContain("text-decoration: underline");
    expect(trigger).not.toContain("border-radius");
  });

  it("moves the card like the native one", () => {
    // The native card fades and travels 4px out from its trigger on `fast`.
    expect(block(".gx-hovercard")).toContain(
      "animation: gx-hovercard-in 160ms ease-out",
    );
    expect(css).toContain("translate: -50% 4px");
  });
});
