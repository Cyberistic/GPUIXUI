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

    expect(
      pullBack(layout.requested, layout.panelWidth, layout.frameWidth),
    ).toBe(layout.left);
    expect(
      pullBackBy(layout.requested, layout.panelWidth, layout.frameWidth),
    ).toBe(layout.pulledBack);
    expect(layout.left + layout.panelWidth).toBe(
      layout.frameWidth - POPOVER_COLLISION_PADDING,
    );

    expect(pullBack(40, layout.panelWidth, layout.frameWidth)).toBe(40);

    expect(collision).toContain(`left:${layout.left}px`);
    expect(collision).toContain(`pulled back ${layout.pulledBack}px`);
  });
});
