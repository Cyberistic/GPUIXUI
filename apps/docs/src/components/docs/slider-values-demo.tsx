/**
 * Browser preview for the Slider component page.
 *
 * The shipped slider is a GPUix host tree, so the preview draws the track, its
 * fill and the thumbs from the theme bridge and says so. It teaches the one API
 * fact a drawing can: one component takes a number or a pair.
 */

/** One track: a fill, and one thumb per value. */
const Track = ({
  label,
  values,
  max,
}: {
  readonly label: string;
  readonly values: ReadonlyArray<number>;
  readonly max: number;
}) => (
  <div className="gx-slider-block">
    <span className="gx-slider-readout">
      {label} · {values.join(" – ")}
    </span>
    <div
      aria-label={label}
      aria-valuetext={values.join(" – ")}
      className="gx-slider"
      role={values.length === 2 ? "group" : "slider"}
    >
      <span className="gx-slider-track">
        <span
          className="gx-slider-fill"
          style={{
            marginLeft: `${((values[0] ?? 0) / max) * 100}%`,
            width: `${(((values.at(-1) ?? 0) - (values[0] ?? 0)) / max) * 100}%`,
          }}
        />
      </span>
      {values.map((value, index) => (
        <span
          aria-hidden="true"
          className="gx-slider-thumb"
          key={index}
          style={{ left: `${(value / max) * 100}%` }}
        />
      ))}
    </div>
  </div>
);

export const SliderValues = () => (
  <div className="gx-demo gx-demo-column gx-slider-scene">
    <Track label="Quality" max={100} values={[62]} />
    <Track label="Price" max={200} values={[20, 80]} />
  </div>
);

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
