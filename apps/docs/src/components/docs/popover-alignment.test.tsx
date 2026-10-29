import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  POPOVER_ALIGNMENTS,
  alignLabel,
  alignedLeft,
  alignedPlacement,
  alignmentLayout,
  type PopoverAlign,
} from "./popover-alignment";
import {
  POPOVER_COLLISION_PADDING,
  POPOVER_FRAME_PADDING,
  POPOVER_FRAME_WIDTH,
  POPOVER_PANEL_WIDTH,
  POPOVER_TRIGGER_WIDTH,
} from "./popover-preview";
import { PopoverAligned } from "./popover-sides";

/**
 * The popover's three alignments, held to the component and to the stage.
 *
 * The bug these guard: `PopoverContent` defaulted to `align="start"`, so the
 * page's `Columns` trigger sat on its panel's left corner while shadcn centres
 * a popover on its trigger. Each alignment case below holds the relation its
 * name promises against the trigger's own box, and the collision case holds the
 * shift that keeps a panel inside the stage without re-aligning it.
 *
 * `node:fs` is a test-time read of the component's source, as the sides and
 * collision drawing's test already does.
 */

const component = readFileSync(
  new URL(
    "../../../../../packages/components/src/popover.tsx",
    import.meta.url,
  ),
  "utf8",
);

const stageWidth = POPOVER_FRAME_WIDTH;
const trigger = {
  x: (stageWidth - POPOVER_TRIGGER_WIDTH) / 2,
  width: POPOVER_TRIGGER_WIDTH,
};

/** React writes a zero length without its unit. */
const cssLength = (value: number): string => (value === 0 ? "0" : `${value}px`);

const panelOf = (align: PopoverAlign) => {
  const left = alignedLeft({
    align,
    triggerX: trigger.x,
    triggerWidth: trigger.width,
    panelWidth: POPOVER_PANEL_WIDTH,
  });

  return { left, centre: left + POPOVER_PANEL_WIDTH / 2 };
};

const relations: ReadonlyArray<
  readonly [PopoverAlign, (panel: ReturnType<typeof panelOf>) => void]
> = [
  ["start", (panel) => expect(panel.left).toBe(trigger.x)],
  [
    "center",
    (panel) => expect(panel.centre).toBe(trigger.x + trigger.width / 2),
  ],
  [
    "end",
    (panel) =>
      expect(panel.left + POPOVER_PANEL_WIDTH).toBe(trigger.x + trigger.width),
  ],
];

describe("the popover's alignments", () => {
  it("gives each alignment the edge its name promises, inside the stage", () => {
    // Each case fails on a swapped rule: `start` sharing the centre line, or
    // `end` sharing the left edge, is a different number below.
    for (const [align, expectRelation] of relations) {
      const panel = panelOf(align);

      expectRelation(panel);
      expect(panel.left).toBeGreaterThanOrEqual(POPOVER_COLLISION_PADDING);
      expect(panel.left + POPOVER_PANEL_WIDTH).toBeLessThanOrEqual(
        stageWidth - POPOVER_COLLISION_PADDING,
      );
    }
  });

  it("draws the panel on the alignment the control names", () => {
    for (const align of POPOVER_ALIGNMENTS) {
      const markup = renderToStaticMarkup(<PopoverAligned align={align} />);
      const layout = alignmentLayout(align);

      expect(markup).toContain(
        `style="left:${cssLength(layout.offset)};width:${POPOVER_PANEL_WIDTH}px"`,
      );
      expect(markup).toContain(`data-align="${align}"`);
      expect(markup).toMatch(
        new RegExp(
          `<button[^>]*aria-pressed="true"[^>]*>${alignLabel(align)}</button>`,
        ),
      );
    }
  });

  it("puts the control above the stage and outside the panel", () => {
    const markup = renderToStaticMarkup(<PopoverAligned />);
    const control = markup.indexOf('aria-label="Popover align"');
    const stage = markup.indexOf('class="gx-popover-stage"');
    const panel = markup.indexOf('role="dialog"');

    expect(control).toBeGreaterThanOrEqual(0);
    expect(control).toBeLessThan(stage);
    expect(stage).toBeLessThan(panel);
    // The library's own toggle family, not a second control shape.
    expect(markup).toContain('class="gx-tgroup"');
    expect(markup).toContain("gx-toggle gx-toggle-outline");
  });

  it("shifts a panel that would leave the stage without re-aligning it", () => {
    // The collision drawing's trigger: 24px from the frame's right edge. A
    // start-aligned panel would put its right edge at 576 and leave the frame
    // at 592, so the clamp slides it back to the collision margin.
    const edge = stageWidth - POPOVER_FRAME_PADDING - POPOVER_TRIGGER_WIDTH;
    const placement = alignedPlacement({
      align: "start",
      triggerX: edge,
      triggerWidth: POPOVER_TRIGGER_WIDTH,
      panelWidth: POPOVER_PANEL_WIDTH,
      stageWidth,
    });

    expect(placement.requested).toBeGreaterThan(
      stageWidth - POPOVER_COLLISION_PADDING - POPOVER_PANEL_WIDTH,
    );
    expect(placement.left + POPOVER_PANEL_WIDTH).toBe(
      stageWidth - POPOVER_COLLISION_PADDING,
    );
    expect(placement.shifted).toBeGreaterThan(0);
    // Shifted, not silently re-aligned: an end placement would sit 16px left of
    // this box, with the panel's right edge on the trigger's.
    expect(placement.left).not.toBe(
      edge + POPOVER_TRIGGER_WIDTH - POPOVER_PANEL_WIDTH,
    );
    expect(placement.left + POPOVER_PANEL_WIDTH).not.toBe(
      edge + POPOVER_TRIGGER_WIDTH,
    );
  });

  it("keeps the component's names and its centred default", () => {
    // The default is read from the component, not from the drawing: the page
    // may only paint what the shipped `PopoverContent` defaults to.
    expect(component).toContain('align = "center"');
    expect(component).toContain('align?: "start" | "center" | "end";');
    expect(component).not.toContain('align = "start"');
    expect(POPOVER_ALIGNMENTS).toEqual(["start", "center", "end"]);
  });
});
