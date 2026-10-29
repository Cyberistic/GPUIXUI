/**
 * Browser preview for the Slider component page.
 *
 * The shipped slider is a GPUix host tree, so the preview draws the track, its
 * fill and the thumbs from the theme bridge and says so. It teaches the one API
 * fact a drawing can — one component takes a number or a pair — and it is live:
 * a press on the track jumps, a drag keeps reporting after the pointer leaves
 * the rail, a key steps, and the `−`/`+` pair steps the window through the same
 * `stepValue` an arrow key uses.
 */

import { useState } from "react";
import {
  stepValue,
  type ValueRange,
  type ValueSpan,
} from "@gpuixui/primitives/core";
import { SliderDrawing } from "./slider-drawing";
import { shiftSpan } from "./slider-preview";

const QUALITY: ValueRange = { min: 0, max: 100, step: 1 };
const PRICE: ValueRange = { min: 0, max: 200, step: 5 };

/** A live value: the readout, the track, and the stepping pair. */
const Point = ({
  label,
  range,
  value,
  onChange,
}: {
  readonly label: string;
  readonly range: ValueRange;
  readonly value: number;
  readonly onChange: (value: number) => void;
}) => (
  <div className="gx-slider-block">
    <span className="gx-slider-readout">
      {label} · <b>{value}</b>
    </span>
    <div className="gx-slider-row">
      <button
        aria-label={`Decrease ${label}`}
        className="gx-btn gx-btn-outline gx-btn-sm gx-btn-square"
        onClick={() => onChange(stepValue(value, range, -1))}
        type="button"
      >
        −
      </button>
      <SliderDrawing
        label={label}
        onChange={(next) => onChange(next[0] ?? range.min)}
        range={range}
        values={[value]}
      />
      <button
        aria-label={`Increase ${label}`}
        className="gx-btn gx-btn-outline gx-btn-sm gx-btn-square"
        onClick={() => onChange(stepValue(value, range, 1))}
        type="button"
      >
        +
      </button>
    </div>
  </div>
);

/** A live window: both ends, and a stepper that slides the window. */
const Window = ({
  label,
  range,
  span,
  onChange,
}: {
  readonly label: string;
  readonly range: ValueRange;
  readonly span: ValueSpan;
  readonly onChange: (span: ValueSpan) => void;
}) => (
  <div className="gx-slider-block">
    <span className="gx-slider-readout">
      {label} ·{" "}
      <b>
        {span.start} – {span.end}
      </b>
    </span>
    <div className="gx-slider-row">
      <button
        aria-label={`Decrease ${label}`}
        className="gx-btn gx-btn-outline gx-btn-sm gx-btn-square"
        onClick={() => onChange(shiftSpan(span, -1, range))}
        type="button"
      >
        −
      </button>
      <SliderDrawing
        label={label}
        onChange={(next) =>
          onChange({
            start: next[0] ?? span.start,
            end: next[1] ?? span.end,
          })
        }
        range={range}
        values={[span.start, span.end]}
      />
      <button
        aria-label={`Increase ${label}`}
        className="gx-btn gx-btn-outline gx-btn-sm gx-btn-square"
        onClick={() => onChange(shiftSpan(span, 1, range))}
        type="button"
      >
        +
      </button>
    </div>
  </div>
);

export const SliderValues = () => {
  const [quality, setQuality] = useState(62);
  const [price, setPrice] = useState<ValueSpan>({ start: 20, end: 80 });
  return (
    <div className="gx-demo gx-demo-column gx-slider-scene">
      <Point
        label="Quality"
        onChange={setQuality}
        range={QUALITY}
        value={quality}
      />
      <Window label="Price" onChange={setPrice} range={PRICE} span={price} />
    </div>
  );
};

const sliderValuesSource = `import { Slider } from "@gpuixui/components/slider";
import { useState } from "react";

const [quality, setQuality] = useState(62);
const [price, setPrice] = useState<readonly [number, number]>([20, 80]);

<Slider
  label="Quality"
  value={quality}
  onValueChange={(next) =>
    setQuality(typeof next === "number" ? next : next[0])
  }
  formatValue={(value) => \`\${value}%\`}
/>;

// A pair paints two thumbs, and the ends cannot cross.
<Slider
  label="Price"
  value={price}
  min={0}
  max={200}
  step={5}
  onValueChange={(next) => {
    if (isSliderSpan(next)) setPrice(next);
  }}
/>;`;

export { sliderValuesSource };
