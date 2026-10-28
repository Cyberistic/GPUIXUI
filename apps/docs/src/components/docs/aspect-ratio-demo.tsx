/**
 * Browser preview for the Aspect ratio page.
 *
 * The native box paints the runtime's `aspectRatio`; a browser paints the CSS
 * property, which is the same arithmetic, so the preview is honest about the
 * shape even though the surface is the page's. The width is the reader's: the
 * height under the box is `width / ratio`, so dragging the slider shows the
 * re-layout the native box gets for free.
 */

import { useState } from "react";

const RATIOS = [
  { id: "16:9", ratio: 16 / 9 },
  { id: "4:3", ratio: 4 / 3 },
  { id: "1:1", ratio: 1 },
  { id: "3:4", ratio: 3 / 4 },
] as const;

export function AspectRatioDemo() {
  const [width, setWidth] = useState(320);
  const [ratioId, setRatioId] = useState<(typeof RATIOS)[number]["id"]>("16:9");
  const ratio = RATIOS.find((entry) => entry.id === ratioId)?.ratio ?? 16 / 9;

  return (
    <div className="gx-aspect-scene">
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
              className="gx-aspect-ratio"
              data-active={entry.id === ratioId}
              key={entry.id}
              onClick={() => setRatioId(entry.id)}
              type="button"
            >
              {entry.id}
            </button>
          ))}
        </div>
      </div>
      <div
        className="gx-aspect-frame"
        style={{
          width,
          // Reserve the tallest treatment at this width (the 3:4 portrait), so
          // changing the ratio or the width never moves the controls.
          minHeight: Math.round(width / 0.75),
        }}
      >
        <div className="gx-aspect-box" style={{ aspectRatio: String(ratio) }} />
      </div>
      <p className="gx-aspect-readout">
        {width}px wide at {ratioId} · {Math.round(width / ratio)}px tall
      </p>
    </div>
  );
}

export const aspectRatioDemoSource = `import { AspectRatio } from "@gpuixui/components/aspect-ratio";

<AspectRatio ratio={16 / 9}>
  <div style={{ width: "100%", height: "100%" }} />
</AspectRatio>;

// A ratio below one is a portrait box, not a smaller one.
<AspectRatio ratio={3 / 4} style={{ width: 240 }} />;`;
