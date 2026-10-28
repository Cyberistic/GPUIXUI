import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChatDemo } from "./chat-demo";

/**
 * The chat block, as it renders.
 *
 * The bug this guards is the layout shift: the block used to draw a transcript
 * that sized itself to its rows and a status switcher as a control strip, so the
 * composer moved as messages arrived. The block is now a fixed-height frame
 * with a fixed header, the transcript as the only flexible row, a reserved rail
 * for the jump control and a fixed composer.
 *
 * The second bug this guards is the pair of plain rows: the agent's replies were
 * unboxed prose and the reader's bubble was the neutral fill, so the block did
 * not show the chat family it documents. Every turn is now a `Message` row with
 * a `Bubble` — the reader on the primary fill, the agent muted — an avatar and
 * meta line only where a speaker starts, and the grouped run's corners joined.
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

describe("the chat block", () => {
  it("draws a shadcn-shaped frame: title, status, reset, transcript and composer", () => {
    expect(markup).toContain('class="gx-chat-title">New Thread</p>');
    expect(markup).toContain('class="gx-chat-summary"');
    expect(markup).toContain(">Reset</button>");
    expect(markup).toContain('class="gx-chat-messages"');
    expect(markup).toContain('class="gx-chat-composer"');
    expect(markup).toContain('class="gx-chat-rail"');
  });

  it("puts every turn in a bubble: the reader on primary, the agent muted", () => {
    expect(markup.match(/class="gx-bubble-surface"/g)?.length).toBe(4);
    expect(markup.match(/data-variant="default"/g)?.length).toBe(2);
    expect(markup.match(/data-variant="muted"/g)?.length).toBe(2);
    expect(markup.match(/data-align="end"/g)?.length).toBe(2);
    expect(markup.match(/data-align="start"/g)?.length).toBe(2);
    expect(markup).not.toContain("gx-chat-bubble");
    expect(block('.gx-bubble-surface[data-variant="default"]')).toContain(
      "background: var(--primary)",
    );
    expect(block('.gx-bubble-surface[data-variant="muted"]')).toContain(
      "background: var(--muted)",
    );
  });

  it("shows an avatar and a meta line only where a speaker starts", () => {
    expect(markup.match(/class="gx-chat-row"/g)?.length).toBe(4);
    expect(markup.match(/class="gx-chat-avatar"/g)?.length).toBe(4);
    expect(markup.match(/class="gx-chat-avatar" data-empty=""/g)?.length).toBe(
      1,
    );
    expect(markup.match(/class="gx-chat-meta"/g)?.length).toBe(3);
    expect(markup).toContain("Assistant · 09:41");
  });

  it("groups one speaker's consecutive rows and joins their corners", () => {
    // One run of two assistant rows: its first bubble joins below, its last
    // joins above, so the pair reads as one column.
    expect(markup.match(/data-group="first"/g)?.length).toBe(1);
    expect(markup.match(/data-group="last"/g)?.length).toBe(1);
    expect(block(".gx-chat-turn")).toContain("gap: 6px");
    expect(block(".gx-chat-content")).toContain("gap: 16px");
    expect(
      block('.gx-bubble[data-group="first"] > .gx-bubble-surface'),
    ).toContain("border-bottom-left-radius: var(--radius-sm)");
  });

  it("hangs one reaction pill over its bubble's edge", () => {
    expect(markup.match(/class="gx-bubble-reactions"/g)?.length).toBe(1);
    expect(markup).toContain('aria-label="Reaction: 👍"');
    expect(block(".gx-bubble-reactions")).toContain("margin-top: -10px");
    expect(block(".gx-bubble-reactions")).toContain(
      "box-shadow: 0 0 0 2px var(--background)",
    );
  });

  it("keeps the composer's y fixed: the frame has a height and the middle is the only grower", () => {
    expect(block(".gx-chat")).toContain("height: 560px");
    expect(block(".gx-chat")).toContain("display: flex");
    expect(block(".gx-chat-messages")).toContain("flex: 1 1 0");
    expect(block(".gx-chat-messages")).toContain("min-height: 0");
    expect(block(".gx-chat-messages")).toContain("overflow-y: auto");
    expect(block(".gx-chat-head")).toContain("flex: 0 0 auto");
    expect(block(".gx-chat-composer")).toContain("flex: 0 0 auto");
    expect(block(".gx-chat-rail")).toContain("flex: 0 0 auto");
  });

  it("reserves the jump rail instead of taking height from the transcript", () => {
    const rail = block(".gx-chat-rail");
    expect(rail).toContain("height:");
    expect(rail).not.toContain("display: none");
    const control = block(".gx-chat-rail .gx-btn");
    expect(control).toContain("opacity: 0");
    expect(control).toContain("pointer-events: none");
    expect(block('.gx-chat-rail .gx-btn[data-active="true"]')).toContain(
      "opacity: 1",
    );
  });

  it("puts Send, Stop and the field in the composer", () => {
    expect(markup).toContain('class="gx-chat-field"');
    expect(markup).toContain(">Send</button>");
    expect(block(".gx-chat-composer")).toContain(
      "border: 1px solid var(--border)",
    );
    expect(block(".gx-chat-composer")).toContain("background: var(--card)");
  });

  it("has no segmented status switcher", () => {
    expect(markup).not.toContain("gx-chat-switch");
    expect(markup).not.toContain("gx-chat-choice");
  });
});
