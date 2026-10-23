import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
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

const css = readFileSync(
  fileURLToPath(new URL("../../styles/landing.css", import.meta.url)),
  "utf8",
);

const rule = (selector: string, last = false): string => {
  const start = last
    ? css.lastIndexOf(`${selector} {`)
    : css.indexOf(`${selector} {`);
  return start === -1 ? "" : css.slice(start, css.indexOf("}", start));
};

describe("the landing deck", () => {
  it("mounts the conversations block in all three desktops", () => {
    expect(markup.match(/class="landing-window landing-desktop/g)).toHaveLength(
      3,
    );
    expect(markup.match(/data-desktop="/g)).toHaveLength(3);
    expect(markup.match(/class="gx-conv"/g)).toHaveLength(3);
    expect(markup.match(/class="gx-conv-side"/g)).toHaveLength(3);
    expect(markup).toContain("Killua Zoldyck");
    expect(markup).toContain("Greed Island run");
  });

  it("draws a desktop under each window: wallpaper and shell", () => {
    expect(markup).toContain('class="landing-wall landing-wall-mac"');
    expect(markup).toContain('class="landing-wall landing-wall-win"');
    expect(markup).toContain('class="landing-wall landing-wall-lnx"');
    // macOS menu bar and dock, the Windows taskbar, the Linux panel and dock.
    expect(markup.match(/class="landing-menubar"/g)).toHaveLength(1);
    expect(markup.match(/class="landing-taskbar"/g)).toHaveLength(1);
    expect(markup.match(/class="landing-lnx-panel"/g)).toHaveLength(1);
    expect(markup.match(/class="landing-dock landing-dock-/g)).toHaveLength(2);
    expect(markup).toContain(">Finder<");
    expect(markup).toContain(">Search<");
    expect(markup).toContain(">Applications<");
    expect(markup.match(/class="landing-dock-tile"/g)?.length).toBeGreaterThan(
      20,
    );
  });

  it("keeps the desktop chrome decorative", () => {
    for (const shell of [
      'class="landing-menubar"',
      'class="landing-taskbar"',
      'class="landing-lnx-panel"',
      'class="landing-dock landing-dock-mac"',
      'class="landing-dock landing-dock-lnx"',
    ]) {
      const at = markup.indexOf(shell);
      expect(at).toBeGreaterThan(-1);
      expect(markup.slice(at - 200, at)).toContain('aria-hidden="true"');
    }
  });

  it("paints three distinct CSS wallpapers", () => {
    const walls = [
      ".landing-wall-mac",
      ".landing-wall-win",
      ".landing-wall-lnx",
    ];
    const gradients = walls.map((wall) => rule(wall));
    for (const gradient of gradients) expect(gradient).toContain("gradient");
    expect(new Set(gradients).size).toBe(3);
  });

  it("gives the three cards one height", () => {
    const desktop = css.slice(
      css.indexOf("/* Each card is a desktop"),
      css.indexOf("/* Sonoma"),
    );
    expect(desktop).toContain("height: 560px");
    expect(css).not.toMatch(
      /\.landing-desktop-(?:mac|win|lnx)\s*\{[^}]*height:/,
    );
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
