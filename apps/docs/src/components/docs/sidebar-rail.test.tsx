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

const noop = () => {};

const toggle = (collapsed: boolean): string =>
  renderToStaticMarkup(<RailToggle collapsed={collapsed} onToggle={noop} />);

const css = readFileSync(
  fileURLToPath(new URL("../../styles/blocks.css", import.meta.url)),
  "utf8",
);

const block = (selector: string): string => {
  const start = css.indexOf(selector);
  const open = start === -1 ? -1 : css.indexOf("{", start);
  return open === -1 ? "" : css.slice(open, css.indexOf("}", open) + 1);
};

const railBlocks = [
  "gx-conv-side",
  "gx-fm-side",
  "gx-mail-side",
  "gx-kan-side",
  "gx-set-side",
] as const;

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
    for (const rail of railBlocks) {
      expect(block(`.${rail}[data-collapsed="true"]`), rail).toContain(
        `width: ${RAIL_COLLAPSED_WIDTH}px`,
      );
      expect(css, rail).toContain(
        `.${rail}[data-collapsed="true"] .gx-rail-label`,
      );
    }

    expect(css).toContain(`width ${RAIL_TRANSITION_MS}ms ease`);
    expect(css).toContain(`padding ${RAIL_TRANSITION_MS}ms ease`);

    expect(css).toContain("opacity: 0");
    expect(css).toContain("max-width: 0");

    expect(css).toContain("prefers-reduced-motion: reduce");
  });
});
