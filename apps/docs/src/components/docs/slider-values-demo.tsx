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
