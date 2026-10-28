/**
 * Browser preview for the Aspect ratio page.
 *
 * The native box paints the runtime's `aspectRatio`; a browser paints the CSS
 * property, which is the same arithmetic, so the preview is honest about the
 * shape even though the surface is the page's. The width is the reader's: the
 * height under the box is `width / ratio`, so dragging the slider shows the
 * re-layout the native box gets for free.
 *
 * The stage is exactly the box at rest — a reservation for the tallest ratio
 * would leave a band of empty page under every wide box. It grows to the
 * tallest only while the reader is in the controls, so the box they are about
 * to choose does not move the page mid-press; the readout sits above the stage
 * for the same reason.
 */

import { useState, type CSSProperties } from "react";

const RATIOS = [
  { id: "16:9", ratio: 16 / 9 },
  { id: "4:3", ratio: 4 / 3 },
  { id: "1:1", ratio: 1 },
  { id: "3:4", ratio: 3 / 4 },
] as const;

const TALLEST = 3 / 4;

export function AspectRatioDemo() {
  const [width, setWidth] = useState(320);
  const [ratioId, setRatioId] = useState<(typeof RATIOS)[number]["id"]>("16:9");
  const ratio = RATIOS.find((entry) => entry.id === ratioId)?.ratio ?? 16 / 9;

  return (
    <div
      className="gx-aspect-scene"
      style={
        {
          "--gx-aspect-width": `${width}px`,
          "--gx-aspect-height": `${Math.round(width / ratio)}px`,
          "--gx-aspect-tallest": `${Math.round(width / TALLEST)}px`,
        } as CSSProperties
      }
    >
      <div className="gx-aspect-controls">
        <label className="gx-aspect-field">
          <span>Width</span>
          <input
            className="gx-aspect-range"
            max={400}
            min={120}
            onChange={(event) => setWidth(Number(event.target.value))}
            step={20}
            type="range"
            value={width}
          />
          <span className="gx-aspect-readout">{width}px</span>
        </label>
        <div className="gx-aspect-ratios">
          {RATIOS.map((entry) => (
            <button
              aria-pressed={entry.id === ratioId}
              className={`gx-btn gx-btn-sm ${entry.id === ratioId ? "gx-btn-secondary" : "gx-btn-outline"}`}
              key={entry.id}
              onClick={() => setRatioId(entry.id)}
              type="button"
            >
              {entry.id}
            </button>
          ))}
        </div>
        <p className="gx-aspect-readout">
          {width}px wide at {ratioId} · {Math.round(width / ratio)}px tall
        </p>
      </div>
      <div className="gx-aspect-frame">
        <div className="gx-aspect-box" style={{ aspectRatio: String(ratio) }} />
      </div>
    </div>
  );
}

export const aspectRatioDemoSource = `import { AspectRatio } from "@gpuixui/components/aspect-ratio";

<AspectRatio ratio={16 / 9}>
  <div style={{ width: "100%", height: "100%" }} />
</AspectRatio>;

// A ratio below one is a portrait box, not a smaller one.
<AspectRatio ratio={3 / 4} style={{ width: 240 }} />;`;
