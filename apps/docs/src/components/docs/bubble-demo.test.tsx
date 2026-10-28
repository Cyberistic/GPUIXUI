import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BubbleDemo } from "./bubble-demo";

/**
 * The Bubble page's drawing, as it renders.
 *
 * The bug this guards: the page drew seven variant swatches stacked as pills
 * instead of a conversation, so a reader could not see the shape the component
 * is for — a right-aligned primary bubble, a left-aligned muted run with joined
 * corners, or a reaction pill crossing a surface's edge. The drawing is now
 * shadcn's demo conversation, and the variants it does not wear sit in a
 * smaller row beneath it.
 */

const markup = renderToStaticMarkup(<BubbleDemo />);

const css = readFileSync(
  new URL("../../styles/demos.css", import.meta.url),
  "utf8",
);

const block = (selector: string): string => {
  const start = css.indexOf(`${selector} {`);
  return start === -1 ? "" : css.slice(start, css.indexOf("}", start));
};

describe("the bubble drawing", () => {
  it("draws the conversation, not a column of swatches", () => {
    expect(markup).toContain("Hey there! what&#x27;s up?");
    expect(markup).toContain("I can group messages");
    expect(markup).toContain("Very meta. Very on-brand.");
    expect(markup.match(/class="gx-bubble-surface"/g)?.length).toBe(5);
  });

  it("puts the reader's bubbles on the end edge and the agent's on the start", () => {
    expect(markup.match(/class="gx-bubble" data-align="end"/g)?.length).toBe(2);
    expect(markup.match(/class="gx-bubble" data-align="start"/g)?.length).toBe(
      3,
    );
    expect(markup.match(/data-variant="default"/g)?.length).toBe(2);
    expect(markup.match(/data-variant="muted"/g)?.length).toBe(3);
    expect(block('.gx-bubble[data-align="end"]')).toContain(
      "align-self: flex-end",
    );
  });

  it("groups the agent's consecutive bubbles and joins their inner corners", () => {
    expect(markup.match(/data-group="first"/g)?.length).toBe(1);
    expect(markup.match(/data-group="last"/g)?.length).toBe(1);
    expect(block(".gx-bubble-group")).toContain("gap: 8px");
    expect(
      block('.gx-bubble[data-group="first"] > .gx-bubble-surface'),
    ).toContain("border-bottom-right-radius: var(--radius-sm)");
    expect(
      block('.gx-bubble[data-group="last"] > .gx-bubble-surface'),
    ).toContain("border-top-right-radius: var(--radius-sm)");
  });

  it("hangs the reaction pills over the bubbles' edges", () => {
    expect(markup.match(/class="gx-bubble-reactions"/g)?.length).toBe(2);
    expect(markup).toContain("👍🔥👀+2");
    expect(block(".gx-bubble-reactions")).toContain("margin-top: -10px");
    expect(block(".gx-bubble-reactions")).toContain("border-radius: 9999px");
  });

  it("lists the variants the conversation does not wear in a smaller row", () => {
    expect(markup).toContain('aria-label="Other bubble variants"');
    expect(markup.match(/gx-bubble-chip/g)?.length).toBe(5);
    expect(block(".gx-bubble-chip")).toContain("font-size: 12px");
  });
});
