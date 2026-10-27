import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PopoverCollision, PopoverSides } from "./popover-sides";
import {
  POPOVER_COLLISION_PADDING,
  POPOVER_SIDE_OFFSET,
  POPOVER_SIDES,
  collisionLayout,
  pullBack,
  pullBackBy,
  sideLabel,
} from "./popover-preview";

/**
 * The popover drawings' sides and collision arithmetic, held to the component.
 *
 * The bugs these guard: a page that showed only the default side, a drawing
 * whose gap was not the component's `sideOffset`, and a panel at the frame's
 * edge that overhung it instead of sliding back by `collisionPadding`. The
 * component's two defaults are read out of its source, so the model cannot
 * become a second source of truth.
 *
 * `node:fs` is a test-time read of a checked-in file.
 */

const component = readFileSync(
  new URL(
    "../../../../../packages/components/src/popover.tsx",
    import.meta.url,
  ),
  "utf8",
);

const css = readFileSync(
  new URL("../../styles/demos.css", import.meta.url),
  "utf8",
);

const block = (selector: string): string => {
  const start = css.indexOf(`${selector} {`);
  return start === -1 ? "" : css.slice(start, css.indexOf("}", start));
};

const defaultOf = (name: "sideOffset" | "collisionPadding"): number => {
  const match = new RegExp(`${name} = (\\d+)`).exec(component)?.[1];
  if (match === undefined)
    throw new Error(`popover.tsx: ${name} has no default`);
  return Number(match);
};

const sides = renderToStaticMarkup(<PopoverSides />);
const collision = renderToStaticMarkup(<PopoverCollision />);

describe("the popover preview", () => {
  it("takes its gap and snap margin from the component's own defaults", () => {
    expect(POPOVER_SIDE_OFFSET).toBe(defaultOf("sideOffset"));
    expect(POPOVER_COLLISION_PADDING).toBe(defaultOf("collisionPadding"));

    // Every side in the drawing uses the same gap the component does.
    expect(block(".gx-popover")).toContain("--gx-popover-gap: 6px");
    for (const side of POPOVER_SIDES) {
      expect(block(`.gx-popover[data-side="${side}"]`)).toContain(
        "var(--gx-popover-gap)",
      );
    }
  });

  it("shows all four sides on one trigger, with the requested one marked", () => {
    expect(sides.match(/class="gx-popover gx-popover-sided"/g)).toHaveLength(1);
    expect(sides).toContain('data-side="bottom"');
    expect(sides).toContain('aria-pressed="true"');

    for (const side of POPOVER_SIDES) {
      expect(sides).toContain(`>${sideLabel(side)}<`);
    }
  });

  it("slides a panel at the frame's edge back by the collision margin", () => {
    const layout = collisionLayout();

    // The shape of the rule, on numbers a reader can check.
    expect(
      pullBack(layout.requested, layout.panelWidth, layout.frameWidth),
    ).toBe(layout.left);
    expect(
      pullBackBy(layout.requested, layout.panelWidth, layout.frameWidth),
    ).toBe(layout.pulledBack);
    expect(layout.left + layout.panelWidth).toBe(
      layout.frameWidth - POPOVER_COLLISION_PADDING,
    );
    // Room to the left keeps the requested edge.
    expect(pullBack(40, layout.panelWidth, layout.frameWidth)).toBe(40);

    // The drawing paints the computed box and prints the computed numbers.
    expect(collision).toContain(`left:${layout.left}px`);
    expect(collision).toContain(`pulled back ${layout.pulledBack}px`);
  });
});
