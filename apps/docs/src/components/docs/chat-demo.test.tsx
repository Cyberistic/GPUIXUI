import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChatDemo } from "./chat-demo";

/**
 * The chat preview, as it renders.
 *
 * The drawing used to be a bordered transcript box holding two avatar-less
 * messages, with the status switcher sitting on the baseline as three loose
 * buttons. A real conversation has an author and a time per row, the reader's
 * own words in a filled bubble on the end edge, and the composer is the only
 * bordered surface — which is what `CHAT_COMPOSER` ships.
 */

const markup = renderToStaticMarkup(<ChatDemo />);

const css = readFileSync(
  new URL("../../styles/demos.css", import.meta.url),
  "utf8",
);

const block = (selector: string): string => {
  const start = css.indexOf(`${selector} {`);
  return start === -1 ? "" : css.slice(start, css.indexOf("}", start));
};

describe("the chat preview", () => {
  it("draws a transcript with both roles, their authors and times", () => {
    expect(markup.match(/class="gx-chat-row"/g)?.length).toBe(3);
    expect(markup.match(/data-role="assistant"/g)?.length).toBe(4);
    expect(markup.match(/data-role="user"/g)?.length).toBe(2);
    expect(markup).toContain('class="gx-chat-author">Atlas</span>');
    expect(markup).toContain('class="gx-chat-author">You</span>');
    expect(markup).toContain('class="gx-chat-time">09:41</span>');
    expect(markup).toContain('class="gx-chat-time">09:42</span>');
  });

  it("dresses the switcher as one segmented control", () => {
    expect(markup.match(/class="gx-chat-choice"/g)?.length).toBe(3);
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).not.toContain("gx-chat-status");
    expect(block(".gx-chat-switch")).toContain("background: var(--muted)");
    expect(block(".gx-chat-switch")).toContain("padding: 2px");
    expect(block(".gx-chat-choice[data-chosen]")).toContain(
      "background: var(--card)",
    );
  });

  it("keeps the transcript on the page and the composer bordered", () => {
    const messages = block(".gx-chat-messages");
    expect(messages).not.toContain("border");
    expect(messages).not.toContain("background");
    expect(block(".gx-chat-composer")).toContain(
      "border: 1px solid var(--border)",
    );
    expect(block(".gx-chat-composer")).toContain("background: var(--card)");
  });

  it("has a divider for the streaming state", () => {
    expect(css).toContain("/* The live seam:");
    expect(block(".gx-chat-divider")).toContain("font-size: 11px");
    const rules = css.slice(css.indexOf(".gx-chat-divider::before"));
    expect(rules.slice(0, rules.indexOf("}"))).toContain(
      "background: var(--border)",
    );
  });

  it("composes the field, Send and the keyboard hint", () => {
    expect(markup).toContain('class="gx-chat-field"');
    expect(markup).toContain(">Send</button>");
    expect(markup).toContain("Enter sends · Shift+Enter adds a line");
  });
});
