import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { rulesFor } from "./css-rules";
import { Showcase } from "./showcase";

/**
 * The landing's showcase grid, held to a masonry.
 *
 * The gallery cascades down four columns so a short tile is followed
 * immediately by the next one. The tiles are ordered to land within a few
 * dozen pixels of one another, and the bottom edge fades so the last row runs
 * off the page rather than ending on a hard card edge.
 */

const read = (path: string): string =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const css = read("../../styles/landing.css");
const markup = renderToStaticMarkup(<Showcase />);

/** The declarations a selector heads, across every rule that names it. */
const rule = (selector: string): string =>
  rulesFor(css, selector)
    .map((found) => found.declarations)
    .join("\n");

describe("the showcase's grid", () => {
  it("cascades the tiles in masonry columns", () => {
    const tiles = rule(".landing-grid-tiles");

    expect(tiles).toContain("columns: 4 260px");
    expect(tiles).toContain("column-gap: 12px");
    expect(tiles).not.toContain("display: flex");
    expect(tiles).not.toContain("grid-template-columns");
  });

  it("keeps a tile whole instead of breaking it across columns", () => {
    expect(rule(".landing-grid-tile")).toContain("break-inside: avoid");
  });

  it("fades the gallery's bottom edge", () => {
    expect(rule(".landing-grid-tiles")).toContain("mask-image");
    expect(rule(".landing-grid-tiles")).toContain("transparent");
  });

  it("mounts the chat inside the masonry, one column wide", () => {
    const tiles = markup.indexOf('class="landing-grid-tiles"');
    const chat = markup.indexOf("landing-grid-tile-chat");

    expect(tiles).toBeGreaterThan(-1);
    expect(chat).toBeGreaterThan(tiles);
    expect(markup).not.toContain("landing-grid-conversation");
  });

  it("sizes the chat as a single-column card", () => {
    const chat = rule(".landing-chat-scene .gx-chat");

    expect(chat).toContain("width: 100%");
    expect(chat).toContain("height: 340px");
    expect(markup).toContain('class="gx-chat-title">Killua<');
  });

  it("shows only the registry install command", () => {
    expect(markup).toContain("@sudokw/primitives-button");
    expect(markup).toContain("shadcn@latest");
    expect(markup).not.toContain("One command, then import it.");
    expect(markup).not.toContain(">Install<");
  });

  it("keeps a masonry at every breakpoint", () => {
    const tileRules = rulesFor(css, ".landing-grid-tiles");

    expect(tileRules.length).toBeGreaterThan(1);
    expect(
      tileRules.every((found) => found.declarations.includes("columns:")),
    ).toBe(true);
  });
});
