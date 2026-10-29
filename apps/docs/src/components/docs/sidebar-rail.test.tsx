import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  RAIL_COLLAPSED_WIDTH,
  RAIL_TRANSITION_MS,
  RailToggle,
  railToggleLabel,
  toggleRail,
} from "./sidebar-rail";

/**
 * The rail-collapse rule every block shares.
 *
 * The bug this guards: a rail that collapses without stating its state leaves a
 * reader with a toggle that announces nothing, and a rail that changes width
 * with no transition jumps the content pane. A navigation rail keeps a 64px
 * icon strip; a conversation list or folder tree folds away whole, because its
 * avatars or glyphs alone are not a rail. The rules are one module and one
 * sheet, so a block cannot invent its own width, label or timing.
 */

const noop = () => {};

const toggle = (collapsed: boolean): string =>
  renderToStaticMarkup(<RailToggle collapsed={collapsed} onToggle={noop} />);

const css = readFileSync(
  fileURLToPath(new URL("../../styles/blocks.css", import.meta.url)),
  "utf8",
);

/** One rule's body, from its selector to the closing brace. */
const block = (selector: string): string => {
  const start = css.indexOf(selector);
  const open = start === -1 ? -1 : css.indexOf("{", start);
  return open === -1 ? "" : css.slice(open, css.indexOf("}", open) + 1);
};

const iconRailBlocks = ["gx-mail-side", "gx-kan-side", "gx-set-side"] as const;

const foldingPanels = ["gx-conv-side", "gx-fm-side"] as const;

describe("the shared rail rule", () => {
  it("flips one boolean and names the action, not the state", () => {
    expect(toggleRail(false)).toBe(true);
    expect(toggleRail(true)).toBe(false);
    expect(railToggleLabel(false)).toBe("Collapse sidebar");
    expect(railToggleLabel(true)).toBe("Expand sidebar");
  });

  it("announces the state on the toggle as it flips", () => {
    expect(toggle(false)).toContain('aria-expanded="true"');
    expect(toggle(false)).toContain('aria-label="Collapse sidebar"');
    expect(toggle(true)).toContain('aria-expanded="false"');
    expect(toggle(true)).toContain('aria-label="Expand sidebar"');
  });

  it("holds every rail to one width, one transition and one label rule", () => {
    for (const rail of iconRailBlocks) {
      expect(block(`.${rail}[data-collapsed="true"]`), rail).toContain(
        `width: ${RAIL_COLLAPSED_WIDTH}px`,
      );
      expect(css, rail).toContain(
        `.${rail}[data-collapsed="true"] .gx-rail-label`,
      );
    }
    // A list has no icon-only form: it folds to nothing, so the pane never
    // shows a column of unlabelled avatars or folder glyphs.
    for (const panel of foldingPanels) {
      expect(block(`.${panel}[data-collapsed="true"]`), panel).toContain(
        "width: 0",
      );
    }
    // One rule moves every rail, and only its width and padding.
    expect(css).toContain(`width ${RAIL_TRANSITION_MS}ms ease`);
    expect(css).toContain(`padding ${RAIL_TRANSITION_MS}ms ease`);
    // The labels fade to nothing and give their width back.
    expect(css).toContain("opacity: 0");
    expect(css).toContain("max-width: 0");
    // A reader who asked for reduced motion gets the two states, not the trip.
    expect(css).toContain("prefers-reduced-motion: reduce");
  });
});
