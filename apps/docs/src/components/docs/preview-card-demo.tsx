/**
 * Browser preview for the Preview card page.
 *
 * The shipped card is a rich, hoverable surface — what separates it from a
 * tooltip is that it may hold a link or an action, so the pointer may travel
 * from the trigger into the content. It opens on hover or on a press, and it
 * takes the popover's `align`: `start`, `center` (the default) and `end`. The
 * drawing places the card with the popover's own arithmetic and fills the 6px
 * gap with a transparent bridge, so the pointer can cross onto the card and
 * press `Open file` instead of closing it on the way.
 */

import { useState } from "react";
import { alignLabel } from "./popover-alignment";
import {
  PREVIEW_CARD_ALIGNMENTS,
  PREVIEW_CARD_FRAME_WIDTH,
  PREVIEW_CARD_SIDE_OFFSET,
  PREVIEW_CARD_TRIGGER_WIDTH,
  PREVIEW_CARD_WIDTH,
  previewCardLayout,
  type PreviewCardAlign,
} from "./preview-card-preview";

export function PreviewCardDemo({
  align: initialAlign = "center",
}: {
  readonly align?: PreviewCardAlign;
} = {}) {
  const [align, setAlign] = useState<PreviewCardAlign>(initialAlign);
  const [open, setOpen] = useState(true);
  const [last, setLast] = useState("none");
  const layout = previewCardLayout(align);

  return (
    <div className="gx-demo gx-demo-column gx-preview-card-scene">
      <div aria-label="Preview card align" className="gx-tgroup" role="group">
        {PREVIEW_CARD_ALIGNMENTS.map((name) => (
          <button
            aria-pressed={align === name}
            className="gx-btn gx-toggle gx-toggle-outline"
            data-pressed={align === name ? "" : undefined}
            key={name}
            onClick={() => setAlign(name)}
            type="button"
          >
            {alignLabel(name)}
          </button>
        ))}
      </div>
      <div
        className="gx-preview-card-stage"
        style={{ width: PREVIEW_CARD_FRAME_WIDTH }}
      >
        <div
          className="gx-preview-card-anchor"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          style={{ marginLeft: layout.triggerX }}
        >
          <button
            aria-expanded={open}
            className="gx-preview-card-trigger"
            onClick={() => setOpen((value) => !value)}
            style={{ width: PREVIEW_CARD_TRIGGER_WIDTH }}
            type="button"
          >
            design-system.md
          </button>
          {open ? (
            <span
              aria-hidden="true"
              className="gx-preview-card-bridge"
              style={{
                height: PREVIEW_CARD_SIDE_OFFSET,
                left: layout.offset,
                width: PREVIEW_CARD_WIDTH,
              }}
            />
          ) : null}
          {open ? (
            <div
              aria-label="design-system.md"
              className="gx-preview-card"
              data-align={align}
              role="group"
              style={{ left: layout.offset, width: PREVIEW_CARD_WIDTH }}
            >
              <p className="gx-preview-card-title">design-system.md</p>
              <p className="gx-preview-card-body">
                Tokens, semantic roles and the theme extension mechanism — the
                one file every surface reads.
              </p>
              <button
                className="gx-preview-card-link"
                onClick={() => setLast("Open file")}
                type="button"
              >
                Open file ↗
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <p className="gx-preview-card-readout" role="status">
        align=&quot;{align}&quot; · card left {layout.left} · last action:{" "}
        <b>{last}</b>
      </p>
    </div>
  );
}

export const previewCardDemoSource = `import {
  PreviewCard,
  PreviewCardContent,
  PreviewCardTrigger,
} from "@gpuixui/components";

// The card takes the popover's alignments; centre is the default.
<PreviewCard>
  <PreviewCardTrigger>design-system.md</PreviewCardTrigger>
  <PreviewCardContent label="design-system.md" align="center">
    <text>Tokens, semantic roles and the theme extension mechanism.</text>
    <button onClick={openFile}>Open file</button>
  </PreviewCardContent>
</PreviewCard>;`;
