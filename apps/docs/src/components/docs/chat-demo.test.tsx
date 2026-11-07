import { readFileSync } from "node:fs";
import { icons } from "@gpuixui/icons";
import { themes } from "@gpuixui/tokens";
import { CHAT_COMPOSER_ROW, classesToStyle } from "@gpuixui/tw";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { galleryMarkup } from "@/lib/icon-gallery";
import { ChatDemo } from "./chat-demo";

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
    expect(markup).toContain('class="gx-chat-stage"');
  });

  it("names the dossier's work: the intel bank, seals, the exam and the register", () => {
    expect(markup).toContain(
      "Is the Valar Mortis dossier ready for the register?",
    );
    expect(markup).toContain("the intel bank is still missing two seals");
    expect(markup).toContain("The exam is passed");
    expect(markup).toContain("The renown is banked with the licence");
    expect(markup).toContain("Then seal it and enter it in the register.");
    expect(markup).not.toContain("release");
    expect(markup).not.toContain("deploy");
    expect(markup).not.toContain("roll it out");
  });

  it("gives the header a line worth reading and real controls", () => {
    expect(markup).not.toContain(">Ready<");
    expect(markup).toContain(
      "Ask the agent to seal a dossier or move a licence.",
    );
    expect(markup).toMatch(/<button[^>]*>Reset<\/button>/);
  });

  it("centres Send on the composer row's cross axis", () => {
    expect(block(".gx-chat-composer-row")).toContain("align-items: center");

    expect(
      classesToStyle(CHAT_COMPOSER_ROW, themes.dark).style.alignItems,
    ).toBe("center");
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
    expect(block(".gx-chat-stage")).toContain("flex: 1 1 0");
    expect(block(".gx-chat-stage")).toContain("min-height: 0");
    expect(block(".gx-chat-messages")).toContain("flex: 1 1 0");
    expect(block(".gx-chat-messages")).toContain("min-height: 0");
    expect(block(".gx-chat-messages")).toContain("overflow-y: auto");
    expect(block(".gx-chat-head")).toContain("flex: 0 0 auto");
    expect(block(".gx-chat-composer")).toContain("flex: 0 0 auto");
  });

  it("floats the jump control over the transcript's bottom edge", () => {
    const jump = block(".gx-chat-jump");
    expect(jump).toContain("position: absolute");
    expect(jump).toContain("bottom: 12px");
    expect(jump).toContain("justify-content: center");
    expect(jump).toContain("pointer-events: none");
    expect(block(".gx-chat-jump .gx-btn")).toContain("pointer-events: auto");

    expect(markup).not.toContain("gx-chat-jump");
    expect(markup).not.toContain("Jump to latest");
  });

  it("keeps the scrollbar off the avatar", () => {
    const messages = block(".gx-chat-messages");
    expect(messages).toContain("overflow-y: auto");
    expect(messages).toContain("padding-right: 10px");
    expect(messages).toContain("scrollbar-gutter: stable");
  });

  it("puts Send, Stop and the field in the composer", () => {
    expect(markup).toContain('class="gx-chat-field"');
    expect(markup).toContain('aria-label="Send"');
    expect(block(".gx-chat-composer")).toContain(
      "border: 1px solid var(--border)",
    );
    expect(block(".gx-chat-composer")).toContain("background: var(--card)");
  });

  it("draws Send as the icon set's paper plane, named by the word", () => {
    expect(markup).not.toContain(">Send<");
    expect(markup).toContain('aria-label="Send"');
    expect(markup).toContain(galleryMarkup(icons.send));
    expect(markup).toContain('class="gx-chat-send-icon"');
    expect(markup.match(/class="gx-chat-send-icon"/g)?.length).toBe(1);
  });

  it("has no segmented status switcher", () => {
    expect(markup).not.toContain("gx-chat-switch");
    expect(markup).not.toContain("gx-chat-choice");
  });
});
