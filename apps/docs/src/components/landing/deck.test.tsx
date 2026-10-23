import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  applyStyle,
  platformTheme,
  retroStyles,
  themes,
} from "@gpuixui/tokens";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Hero, nextDesktop } from "./deck";
import { platforms } from "./data";

/**
 * The landing deck after the swap.
 *
 * Each platform card used to run a hunter-licensing chat drawn a second time in
 * `deck.tsx`. It now mounts the conversations block in that platform's dress,
 * so the deck must show all four dresses and none of the retired copy — a
 * regression that reintroduced a bespoke chat, or four identical macOS cards,
 * would still build.
 *
 * Omarchy is the fourth card and the one that is a *look*, not a platform
 * variant: its window must carry `data-platform="omarchy"` and the Tokyo Night
 * roles, not the generic Linux palette, because "follows your theme" is the
 * whole claim the card makes.
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

const omarchyCard = (): string => {
  const at = markup.indexOf('data-desktop="omarchy"');
  return at === -1 ? "" : markup.slice(at, at + 2400);
};

/** The theme the Omarchy card must paint: its look over the Linux dark base. */
const omarchyTheme = applyStyle(
  platformTheme(themes.dark, "linux"),
  retroStyles.omarchy,
);

describe("the landing deck", () => {
  it("mounts the conversations block in all four desktops", () => {
    expect(markup.match(/class="landing-window landing-desktop/g)).toHaveLength(
      4,
    );
    expect(markup.match(/data-desktop="/g)).toHaveLength(4);
    expect(markup.match(/class="gx-conv"/g)).toHaveLength(4);
    expect(markup.match(/class="gx-conv-side"/g)).toHaveLength(4);
    expect(markup).toContain("Killua Zoldyck");
    expect(markup).toContain("Greed Island run");
  });

  it("draws a desktop under each window: wallpaper and shell", () => {
    expect(markup).toContain('class="landing-wall landing-wall-mac"');
    expect(markup).toContain('class="landing-wall landing-wall-win"');
    expect(markup).toContain('class="landing-wall landing-wall-lnx"');
    expect(markup).toContain('class="landing-wall landing-wall-omarchy"');
    // macOS menu bar and dock, the Windows taskbar, the Linux panel and dock,
    // and Omarchy's own square dock.
    expect(markup.match(/class="landing-menubar"/g)).toHaveLength(1);
    expect(markup.match(/class="landing-taskbar"/g)).toHaveLength(1);
    expect(markup.match(/class="landing-lnx-panel"/g)).toHaveLength(1);
    expect(markup.match(/class="landing-dock landing-dock-/g)).toHaveLength(3);
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
      'class="landing-dock landing-dock-omarchy"',
    ]) {
      const at = markup.indexOf(shell);
      expect(at).toBeGreaterThan(-1);
      expect(markup.slice(at - 200, at)).toContain('aria-hidden="true"');
    }
  });

  it("paints four distinct CSS wallpapers", () => {
    const walls = [
      ".landing-wall-mac",
      ".landing-wall-win",
      ".landing-wall-lnx",
      ".landing-wall-omarchy",
    ];
    const gradients = walls.map((wall) => rule(wall));
    for (const gradient of gradients) expect(gradient).toContain("gradient");
    expect(new Set(gradients).size).toBe(4);
    // Omarchy's scene is Tokyo Night: the base and the two glows are its own,
    // held in one block because a wallpaper is a picture, not a theme role.
    const tokyo = rule(".landing-wall-omarchy").toLowerCase();
    expect(tokyo).toContain("#1a1b26");
    expect(tokyo).toContain("#7aa2f7");
    expect(tokyo).toContain("#9ece6a");
  });

  it("gives the four cards one height", () => {
    const desktop = css.slice(
      css.indexOf("/* Each card is a desktop"),
      css.indexOf("/* Sonoma"),
    );
    expect(desktop).toContain("height: 560px");
    expect(css).not.toMatch(
      /\.landing-desktop-(?:mac|win|lnx|omarchy)\s*\{[^}]*height:/,
    );
  });

  it("passes a different dress to each card", () => {
    expect(markup).toContain('data-platform="macos"');
    expect(markup).toContain('data-platform="windows"');
    expect(markup).toContain('data-platform="linux"');
    expect(markup).toContain('data-platform="omarchy"');
    expect(markup).toContain(">Online<");
    expect(markup).toContain('placeholder="iMessage"');
    expect(markup.match(/placeholder="Type a message\.\.\."/g)).toHaveLength(3);
  });

  it("paints the Omarchy card in the Tokyo Night roles", () => {
    const card = omarchyCard();

    // The card is the look applied over Linux's dark base, so its own roles
    // reach the window rather than Breeze's.
    for (const role of ["background", "primary", "selected"] as const) {
      expect(card).toContain(`--${role}:${omarchyTheme.colors[role]}`);
    }
    expect(card).not.toContain(`--background:${themes.dark.colors.background}`);
    // Near-square geometry is the look's signature; the Linux card keeps its
    // own radius, so the two dark cards are visibly different.
    expect(card).toContain(`--radius-xl:${omarchyTheme.radius.xl}px`);
    expect(rule(".landing-dock-omarchy .landing-dock-tile")).toContain(
      "border-radius: 2px",
    );
  });

  it("says the Omarchy card follows the active theme", () => {
    expect(markup).toContain("Omarchy · follows your theme");
    expect(markup).toContain('class="landing-omarchy-note"');
    expect(markup).toContain("reads your active theme");
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
    expect(markup.match(/data-pos="/g)).toHaveLength(4);
    expect(markup).toContain("Windows 11");
    expect(markup).toContain("Linux / Arch");
  });

  it("offers Omarchy in the platform switch", () => {
    expect(markup).toContain('value="omarchy"');
    expect(markup).toContain("<span>Omarchy</span>");
    expect(markup.match(/name="platform"/g)).toHaveLength(4);
  });

  it("shuffles through four positions and wraps", () => {
    expect(platforms).toHaveLength(4);
    expect(nextDesktop(0)).toBe(1);
    expect(nextDesktop(1)).toBe(2);
    expect(nextDesktop(2)).toBe(3);
    expect(nextDesktop(3)).toBe(0);
    // The fourth card gets its own slot in the fan rather than sharing one.
    expect(rule('.landing-deck .landing-window[data-pos="3"]')).toContain(
      "scale(0.87)",
    );
  });
});
