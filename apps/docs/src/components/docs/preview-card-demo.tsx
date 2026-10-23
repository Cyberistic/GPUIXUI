/**
 * Browser preview for the Preview card page.
 *
 * The shipped card is a rich, hoverable surface — what separates it from a
 * tooltip is that it may hold a link or an action, so the pointer may travel
 * from the trigger into the content. It opens on hover after a delay or on a
 * press, and leaving both surfaces schedules the close. The preview reproduces
 * that: rest on the trigger to open it, or press it to toggle, and the card
 * stays while the pointer is inside.
 */

import { useState } from "react";

export function PreviewCardDemo() {
  const [open, setOpen] = useState(false);

  return (
    <div className="gx-preview-card-scene">
      <div className="gx-preview-card-anchor">
        <button
          aria-expanded={open}
          className="gx-preview-card-trigger"
          onClick={() => setOpen((value) => !value)}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          type="button"
        >
          design-system.md
        </button>
        {open ? (
          <div
            aria-label="design-system.md"
            className="gx-preview-card"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            role="group"
          >
            <p className="gx-preview-card-title">design-system.md</p>
            <p className="gx-preview-card-body">
              Tokens, semantic roles and the theme extension mechanism — the one
              file every surface reads.
            </p>
            <button className="gx-preview-card-link" type="button">
              Open file ↗
            </button>
          </div>
        ) : null}
      </div>
      <p className="gx-preview-card-note">
        Hover opens it, leaving both surfaces closes it; a press toggles it
        outright. Timers are the component&rsquo;s — pass <code>0</code> to
        disable — and Tab opens nothing by design.
      </p>
    </div>
  );
}

export const previewCardDemoSource = `import {
  PreviewCard,
  PreviewCardContent,
  PreviewCardTrigger,
} from "@gpuixui/components";

<PreviewCard>
  <PreviewCardTrigger>design-system.md</PreviewCardTrigger>
  <PreviewCardContent label="design-system.md">
    <text>Tokens, semantic roles and the theme extension mechanism.</text>
    <button onClick={openFile}>Open file</button>
  </PreviewCardContent>
</PreviewCard>;`;
