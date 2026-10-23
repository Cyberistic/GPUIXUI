import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Hero } from "./deck";

/**
 * The landing deck after the swap.
 *
 * Each platform card used to run a hunter-licensing chat drawn a second time in
 * `deck.tsx`. It now mounts the conversations block in that platform's dress,
 * so the deck must show all three dresses and none of the retired copy — a
 * regression that reintroduced a bespoke chat, or three identical macOS cards,
 * would still build.
 */

const markup = renderToStaticMarkup(<Hero />);

describe("the landing deck", () => {
  it("mounts the conversations block in all three platform windows", () => {
    expect(markup.match(/class="landing-window landing-window-/g)).toHaveLength(
      3,
    );
    expect(markup.match(/class="gx-conv"/g)).toHaveLength(3);
    expect(markup.match(/class="gx-conv-side"/g)).toHaveLength(3);
    expect(markup).toContain("Killua Zoldyck");
    expect(markup).toContain("Greed Island run");
  });

  it("passes a different dress to each card", () => {
    expect(markup).toContain('data-platform="macos"');
    expect(markup).toContain('data-platform="windows"');
    expect(markup).toContain('data-platform="linux"');
    expect(markup).toContain(">Online<");
    expect(markup).toContain('placeholder="iMessage"');
    expect(markup.match(/placeholder="Type a message\.\.\."/g)).toHaveLength(2);
  });

  it("drops the hunter-licensing chat it used to draw", () => {
    expect(markup).not.toContain("Hunter Licensing");
    expect(markup).not.toContain("licensing agent");
    expect(markup).not.toContain("landing-chat");
    expect(markup).not.toContain("General Hunter License");
  });

  it("keeps the platform switch and the shuffled stack", () => {
    expect(markup).toContain('class="landing-deck"');
    expect(markup.match(/data-pos="/g)).toHaveLength(3);
    expect(markup).toContain("Windows 11");
    expect(markup).toContain("Linux / Arch");
  });
});
