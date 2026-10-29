import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { alignLabel } from "./popover-alignment";
import { TooltipDemo } from "./tooltip-demo";
import {
  TOOLTIP_ALIGNMENTS,
  TOOLTIP_FRAME_WIDTH,
  TOOLTIP_TRIGGER_WIDTH,
  TOOLTIP_WIDTH,
  tooltipLayout,
} from "./tooltip-alignment";

/**
 * The tooltip's three alignments, held to the trigger and to the stage.
 *
 * The bug these guard: the page showed one tip with the runtime's `center`
 * and no way to ask for another relation, so a reader could not see what
 * `align="start"` does. Each case below holds the relation its name promises
 * against the trigger's own box, and the markup case holds the control above
 * the stage and outside the tip.
 */

const trigger = {
  x: (TOOLTIP_FRAME_WIDTH - TOOLTIP_TRIGGER_WIDTH) / 2,
  width: TOOLTIP_TRIGGER_WIDTH,
};

const tipOf = (align: (typeof TOOLTIP_ALIGNMENTS)[number]) => {
  const layout = tooltipLayout(align);
  return {
    layout,
    left: layout.left,
    centre: layout.left + TOOLTIP_WIDTH / 2,
  };
};

const relations = [
  [
    "start",
    (tip: ReturnType<typeof tipOf>) => expect(tip.left).toBe(trigger.x),
  ],
  [
    "center",
    (tip: ReturnType<typeof tipOf>) =>
      expect(tip.centre).toBe(trigger.x + trigger.width / 2),
  ],
  [
    "end",
    (tip: ReturnType<typeof tipOf>) =>
      expect(tip.left + TOOLTIP_WIDTH).toBe(trigger.x + trigger.width),
  ],
] as const;

describe("the tooltip's alignments", () => {
  it("gives each alignment the edge its name promises, inside the stage", () => {
    for (const [align, expectRelation] of relations) {
      const tip = tipOf(align);

      expectRelation(tip);
      expect(tip.left).toBeGreaterThanOrEqual(0);
      expect(tip.left + TOOLTIP_WIDTH).toBeLessThanOrEqual(TOOLTIP_FRAME_WIDTH);
    }
  });

  it("puts the alignment control above the stage, on the library's toggle", () => {
    const markup = renderToStaticMarkup(<TooltipDemo />);
    const control = markup.indexOf('aria-label="Tooltip align"');
    const stage = markup.indexOf('class="gx-tip-stage"');

    expect(control).toBeGreaterThanOrEqual(0);
    expect(control).toBeLessThan(stage);
    expect(markup).toContain('class="gx-tgroup"');
    expect(markup).toContain("gx-toggle gx-toggle-outline");
    expect(markup).toMatch(
      new RegExp(
        `<button[^>]*aria-pressed="true"[^>]*>${alignLabel("center")}</button>`,
      ),
    );
  });
});
