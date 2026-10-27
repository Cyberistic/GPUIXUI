/**
 * Browser preview for the Bubble page.
 *
 * The shipped bubble is a GPUix host element, so the page mirrors the surfaces
 * and the grouping rules with HTML. Hover a bubble (or tab into its actions) to
 * reveal the reserved action strip; the grouped run tightens its gap and joins
 * the corners.
 */

import { useState } from "react";

const surfaces = [
  "default",
  "secondary",
  "muted",
  "tinted",
  "outline",
  "ghost",
  "destructive",
] as const;

export function BubbleDemo() {
  const [copied, setCopied] = useState("No action yet.");

  return (
    <div className="gx-bubble-scene">
      {surfaces.map((variant) => (
        <div
          className="gx-bubble-row"
          data-align={variant === "default" ? "end" : "start"}
          key={variant}
        >
          <div className={`gx-bubble gx-bubble-${variant}`}>
            <p className="gx-bubble-text">{variant}</p>
            {variant === "muted" ? (
              <div
                aria-label="Message actions"
                className="gx-bubble-actions"
                role="group"
              >
                <button
                  className="gx-btn gx-btn-ghost gx-btn-sm"
                  onClick={() => setCopied("Copied the muted bubble.")}
                  type="button"
                >
                  Copy
                </button>
                <button
                  className="gx-btn gx-btn-ghost gx-btn-sm"
                  onClick={() => setCopied("Asked for another reply.")}
                  type="button"
                >
                  Retry
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ))}

      <div aria-label="Grouped reply" className="gx-bubble-group" role="group">
        <div className="gx-bubble gx-bubble-secondary" data-group="first">
          <p className="gx-bubble-text">The release is green.</p>
        </div>
        <div className="gx-bubble gx-bubble-secondary" data-group="middle">
          <p className="gx-bubble-text">Three fixes landed.</p>
        </div>
        <div className="gx-bubble gx-bubble-secondary" data-group="last">
          <p className="gx-bubble-text">Roll it out.</p>
        </div>
      </div>

      <p className="gx-bubble-note">{copied}</p>
    </div>
  );
}

export const bubbleDemoSource = `import {
  Bubble,
  BubbleAction,
  BubbleActions,
  BubbleContent,
  BubbleGroup,
} from "@gpuixui/components";

<Bubble variant="muted" align="end">
  <BubbleContent>Roll it out to the whole team.</BubbleContent>
  <BubbleActions label="Message actions">
    <BubbleAction label="Copy" onClick={copy} />
  </BubbleActions>
</Bubble>

<BubbleGroup>
  <Bubble group="first"><BubbleContent>…</BubbleContent></Bubble>
  <Bubble group="middle"><BubbleContent>…</BubbleContent></Bubble>
  <Bubble group="last"><BubbleContent>…</BubbleContent></Bubble>
</BubbleGroup>`;
