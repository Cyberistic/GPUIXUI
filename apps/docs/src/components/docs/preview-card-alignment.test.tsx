import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { alignLabel } from "./popover-alignment";
import { PreviewCardDemo } from "./preview-card-demo";
import {
  PREVIEW_CARD_ALIGNMENTS,
  PREVIEW_CARD_FRAME_WIDTH,
  PREVIEW_CARD_SIDE_OFFSET,
  PREVIEW_CARD_TRIGGER_WIDTH,
  PREVIEW_CARD_WIDTH,
  previewCardLayout,
} from "./preview-card-preview";

/**
 * The preview card's three alignments, its gap bridge and its action.
 *
 * The bugs these guard: the card defaulted to `align="start"` while the popover
 * centres on its trigger; and the card sat 6px below its trigger with nothing
 * filling the gap, so leaving the trigger closed it before the pointer could
 * reach `Open file`. Each alignment case below holds the relation its name
 * promises against the trigger's own box, and the bridge case holds the strip
 * to the component's own `sideOffset`.
 *
 * `node:fs` is a test-time read of the component's source, as the popover's
 * alignment test already does.
 */

const component = readFileSync(
  new URL(
    "../../../../../packages/components/src/preview-card.tsx",
    import.meta.url,
  ),
  "utf8",
);

const trigger = {
  x: (PREVIEW_CARD_FRAME_WIDTH - PREVIEW_CARD_TRIGGER_WIDTH) / 2,
  width: PREVIEW_CARD_TRIGGER_WIDTH,
};

const cardOf = (align: (typeof PREVIEW_CARD_ALIGNMENTS)[number]) => {
  const layout = previewCardLayout(align);
  return {
    layout,
    left: layout.left,
    centre: layout.left + PREVIEW_CARD_WIDTH / 2,
  };
};

/** React writes a zero length without its unit. */
const cssLength = (value: number): string => (value === 0 ? "0" : `${value}px`);

const relations = [
  [
    "start",
    (card: ReturnType<typeof cardOf>) => expect(card.left).toBe(trigger.x),
  ],
  [
    "center",
    (card: ReturnType<typeof cardOf>) =>
      expect(card.centre).toBe(trigger.x + trigger.width / 2),
  ],
  [
    "end",
    (card: ReturnType<typeof cardOf>) =>
      expect(card.left + PREVIEW_CARD_WIDTH).toBe(trigger.x + trigger.width),
  ],
] as const;

describe("the preview card's alignments", () => {
  it("gives each alignment the edge its name promises, inside the stage", () => {
    for (const [align, expectRelation] of relations) {
      const card = cardOf(align);

      expectRelation(card);
      expect(card.left).toBeGreaterThanOrEqual(0);
      expect(card.left + PREVIEW_CARD_WIDTH).toBeLessThanOrEqual(
        PREVIEW_CARD_FRAME_WIDTH,
      );
    }
  });

  it("bridges the component's own gap between trigger and card", () => {
    const layout = previewCardLayout("center");
    const gap = Number(/sideOffset = (\d+)/.exec(component)?.[1]);

    // The strip is the gap: a shorter one leaves a hole the pointer falls
    // through, which is the bug this case guards.
    expect(gap).toBe(PREVIEW_CARD_SIDE_OFFSET);
    expect(layout.left).toBeGreaterThanOrEqual(0);

    const markup = renderToStaticMarkup(<PreviewCardDemo />);
    expect(markup).toContain('class="gx-preview-card-bridge"');
    expect(markup).toContain(`height:${PREVIEW_CARD_SIDE_OFFSET}px`);
  });

  it("draws the card on the alignment the control names", () => {
    for (const align of PREVIEW_CARD_ALIGNMENTS) {
      const markup = renderToStaticMarkup(<PreviewCardDemo align={align} />);
      const layout = previewCardLayout(align);

      expect(markup).toContain(`data-align="${align}"`);
      expect(markup).toContain(
        `left:${cssLength(layout.offset)};width:${PREVIEW_CARD_WIDTH}px`,
      );
      expect(markup).toMatch(
        new RegExp(
          `<button[^>]*aria-pressed="true"[^>]*>${alignLabel(align)}</button>`,
        ),
      );
    }
  });

  it("puts the alignment control above the stage and outside the card", () => {
    const markup = renderToStaticMarkup(<PreviewCardDemo />);
    const control = markup.indexOf('aria-label="Preview card align"');
    const stage = markup.indexOf('class="gx-preview-card-stage"');
    const card = markup.indexOf('class="gx-preview-card"');

    expect(control).toBeGreaterThanOrEqual(0);
    expect(control).toBeLessThan(stage);
    expect(stage).toBeLessThan(card);
    expect(markup).toContain('class="gx-tgroup"');
    expect(markup).toContain("gx-toggle gx-toggle-outline");
  });
});
