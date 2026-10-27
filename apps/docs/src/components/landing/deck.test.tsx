import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Hero, nextDesktop } from "./deck";
import { omarchyCards, platforms } from "./data";

/**
 * The landing deck after Omarchy stopped being a fourth desktop.
 *
 * The deck used to show four windows and called Omarchy the fourth native look;
 * it is not one. Omarchy is the Linux desktop following your own theme, so the
 * deck keeps the three platform windows and the claims that used to live in
 * Omarchy's Tokyo Night window now sit in four small cards under it.
 *
 * The cases below hold that shape: three desktops, three switch positions, four
 * cards. A regression that dressed a fourth window again — or that shipped the
 * cards without their icons — would still build.
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

/** The Omarchy strip's markup, from its opening tag to the deck's footnote. */
const strip = (): string => {
  const start = markup.indexOf('class="landing-omarchy"');
  // The conversations block inside the deck carries a `</header>` of its own,
  // so the slice ends at the hero's, which is the first one after the strip.
  const end = markup.indexOf("</header>", start);
  return start === -1 || end === -1 ? "" : markup.slice(start, end);
};

describe("the landing deck", () => {
  it("mounts the conversations block in the three desktops", () => {
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
    // macOS menu bar and dock, the Windows taskbar, the Linux panel and dock —
    // and no fourth shell: Omarchy's square dock left with its window.
    expect(markup.match(/class="landing-menubar"/g)).toHaveLength(1);
    expect(markup.match(/class="landing-taskbar"/g)).toHaveLength(1);
    expect(markup.match(/class="landing-lnx-panel"/g)).toHaveLength(1);
    expect(markup.match(/class="landing-dock landing-dock-/g)).toHaveLength(2);
    expect(markup).not.toContain("landing-dock-omarchy");
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
    // The Tokyo Night scene is gone: it was the fourth desktop's wallpaper, and
    // the strip under the deck is a theme claim, not a hidden window.
    expect(rule(".landing-wall-omarchy")).toBe("");
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
    expect(markup).not.toContain('data-platform="omarchy"');
    expect(markup).toContain(">Online<");
    expect(markup).toContain('placeholder="iMessage"');
    expect(markup.match(/placeholder="Type a message\.\.\."/g)).toHaveLength(2);
  });

  it("puts the four Omarchy claims under the deck as cards", () => {
    const stripMarkup = strip();

    // The cards stand where the fourth desktop stood: after the deck, before
    // the hero closes.
    expect(markup.indexOf('class="landing-deck"')).toBeLessThan(
      markup.indexOf('class="landing-omarchy"'),
    );
    expect(stripMarkup.match(/class="landing-omarchy-card"/g)).toHaveLength(4);
    expect(stripMarkup.match(/class="landing-omarchy-glyph"/g)).toHaveLength(4);

    for (const card of omarchyCards) {
      expect(stripMarkup).toContain(`data-icon="${card.icon}"`);
      expect(stripMarkup).toContain(card.title);
      expect(stripMarkup).toContain(card.body);
    }

    // The four claims, in the order the brief names them.
    expect(omarchyCards.map((card) => card.title)).toEqual([
      "Follows your theme in Omarchy",
      "Your apps in the terminal",
      "shadcn and React syntax",
      "Everything on the GPU",
    ]);
  });

  it("paints the strip in the page's own roles", () => {
    // The strip is page copy, not a screenshot: it follows the docs theme in
    // both schemes rather than carrying a palette of its own.
    expect(rule(".landing-omarchy-card")).toContain(
      "background: var(--bg-soft)",
    );
    expect(rule(".landing-omarchy-body")).toContain("color: var(--muted)");
    expect(rule(".landing-omarchy-note")).toContain("color: var(--dim)");
    expect(rule(".landing-omarchy-cards")).toContain("repeat(4, 1fr)");
  });

  it("says the Omarchy look re-applies with the desktop's theme", () => {
    expect(markup).toContain('class="landing-omarchy-note"');
    expect(markup).toContain("omarchy-theme-set");
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

  it("offers only the three desktops in the switch", () => {
    expect(markup.match(/name="platform"/g)).toHaveLength(3);
    expect(markup).not.toContain('value="omarchy"');
    expect(markup.match(/<span>Omarchy<\/span>/g)).toBeNull();
  });

  it("shuffles through three positions and wraps", () => {
    expect(platforms).toHaveLength(3);
    expect(nextDesktop(0)).toBe(1);
    expect(nextDesktop(1)).toBe(2);
    expect(nextDesktop(2)).toBe(0);
    // The fan has three slots; the fourth desktop's slot is gone.
    expect(rule('.landing-deck .landing-window[data-pos="2"]')).toContain(
      "scale(0.91)",
    );
    expect(rule('.landing-deck .landing-window[data-pos="3"]')).toBe("");
  });
});
