/**
 * Browser preview for the Slider page.
 *
 * A slider is one value on a closed range. The preview draws a track, a fill
 * leading to the thumb and a disabled state, and reports the value beside it.
 * The Code tab shows the native usage.
 */

const value = 62;

export const SliderDemo = () => (
  <div className="gx-demo gx-demo-column gx-slider-scene">
    <div className="gx-slider-block">
      <span className="gx-slider-readout">Quality · {value}%</span>
      <div
        aria-label="Quality"
        aria-valuetext={`${value}%`}
        className="gx-slider"
        role="slider"
      >
        <span className="gx-slider-track">
          <span className="gx-slider-fill" style={{ width: `${value}%` }} />
        </span>
        <span
          aria-hidden="true"
          className="gx-slider-thumb"
          style={{ left: `${value}%` }}
        />
      </div>
    </div>
    <div className="gx-slider-block" data-disabled>
      <span className="gx-slider-readout">Disabled · 30%</span>
      <div
        aria-label="Disabled"
        aria-valuetext="30%"
        className="gx-slider"
        data-disabled
        role="slider"
      >
        <span className="gx-slider-track">
          <span className="gx-slider-fill" style={{ width: "30%" }} />
        </span>
        <span
          aria-hidden="true"
          className="gx-slider-thumb"
          style={{ left: "30%" }}
        />
      </div>
    </div>
  </div>
);

const sliderDemoSource = `import { Slider, Stack, Text } from "@gpuixui/primitives";
import { useState } from "react";

const [quality, setQuality] = useState(62);

<Stack direction="column" gap="sm">
  <Text role="caption" tone="muted">Quality · {quality}%</Text>
  <Slider
    label="Quality"
    value={quality}
    onValueChange={setQuality}
    formatValue={(value) => \`\${value}%\`}
  />
</Stack>;

<Slider label="Disabled" value={30} disabled />;`;

export { sliderDemoSource };
