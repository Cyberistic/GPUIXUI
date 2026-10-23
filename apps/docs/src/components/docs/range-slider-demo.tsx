/**
 * Browser preview for the RangeSlider page.
 *
 * A range slider is two ends of one interval on a single track. The preview
 * draws the two thumbs and the fill between them, plus an invalid state. The
 * Code tab shows the native usage.
 */

export const RangeSliderDemo = () => (
  <div className="gx-demo gx-demo-column gx-slider-scene">
    <div className="gx-slider-block">
      <span className="gx-slider-readout">Budget · $20 – $80</span>
      <div aria-label="Budget" className="gx-slider" role="group">
        <span className="gx-slider-track">
          <span
            className="gx-slider-fill"
            style={{ left: "20%", width: "60%" }}
          />
        </span>
        <span
          aria-hidden="true"
          className="gx-slider-thumb"
          style={{ left: "20%" }}
        />
        <span
          aria-hidden="true"
          className="gx-slider-thumb"
          style={{ left: "80%" }}
        />
      </div>
    </div>
    <div className="gx-slider-block" data-invalid>
      <span className="gx-slider-readout gx-slider-invalid">
        Invalid · $40 – $60
      </span>
      <div aria-label="Invalid" className="gx-slider" data-invalid role="group">
        <span className="gx-slider-track">
          <span
            className="gx-slider-fill"
            style={{ left: "40%", width: "20%" }}
          />
        </span>
        <span
          aria-hidden="true"
          className="gx-slider-thumb"
          style={{ left: "40%" }}
        />
        <span
          aria-hidden="true"
          className="gx-slider-thumb"
          style={{ left: "60%" }}
        />
      </div>
    </div>
  </div>
);

const rangeSliderDemoSource = `import { RangeSlider, Stack, Text } from "@gpuixui/primitives";
import { useState } from "react";

const [price, setPrice] = useState<readonly [number, number]>([20, 80]);

<Stack direction="column" gap="sm">
  <Text role="caption" tone="muted">\${price[0]} – \${price[1]}</Text>
  <RangeSlider
    label="Budget"
    value={price}
    onValueChange={setPrice}
    step={5}
    formatValue={(value) => \`\${value}\`}
  />
</Stack>;

<RangeSlider label="Invalid" value={[40, 60]} invalid />;`;

export { rangeSliderDemoSource };
