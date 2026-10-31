/**
 * The desktops section (plan 727).
 *
 * Bugs guarded: a desktop shown as an HTML reproduction when the claim is the
 * native look; a capture the page names but the repository does not carry; a
 * switch that offers a fourth desktop for Omarchy, which is a theme of Linux,
 * not a platform; and the Omarchy claims leaving the section.
 */
import { statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { omarchyCards, platforms } from "./data";
import { Desktops } from "./deck";

const markup = renderToStaticMarkup(<Desktops />);
const publicFile = (path: string) =>
  fileURLToPath(new URL(`../../../public${path}`, import.meta.url));

describe("the desktops section", () => {
  it("offers exactly the three desktops", () => {
    expect(markup.match(/role="tab"/g)).toHaveLength(platforms.length);
    expect(platforms.map((p) => p.id)).toEqual(["macos", "windows", "linux"]);
  });

  it("shows a native capture the repository carries, macOS first", () => {
    expect(markup).toContain('src="/media/landing/desktop-darwin.webp"');
    for (const name of ["darwin", "win32", "linux"]) {
      expect(
        statSync(publicFile(`/media/landing/desktop-${name}.webp`)).size,
      ).toBeGreaterThan(0);
    }
    expect(markup).not.toContain("landing-window");
  });

  it("keeps the four Omarchy claims under the capture", () => {
    expect(markup.indexOf("landing-desktop-shot")).toBeLessThan(
      markup.indexOf("landing-omarchy"),
    );
    expect(markup.match(/class="landing-omarchy-card"/g)).toHaveLength(4);
    for (const card of omarchyCards) expect(markup).toContain(card.title);
  });
});
