/**
 * Browser preview for the Slider page.
 *
 * A slider is one value on a closed range, so the drawing drags and steps
 * through the primitive's **own** arithmetic (`@gpuixui/primitives/core`), in
 * the one drawing the three slider pages share: a press aims at a value with
 * `pointerValue`, and an arrow, `PageUp`/`PageDown`, `Home` and `End` go
 * through `decideValueKey`. A drawing that only painted 62% of a track showed a
 * slider nobody ships.
 *
 * The Code tab shows the native usage.
 */

import { useState } from "react";
import type { ValueRange } from "@gpuixui/primitives/core";
import { SliderDrawing } from "./slider-drawing";

const RANGE: ValueRange = { min: 0, max: 100, step: 1 };

export const SliderDemo = () => {
  const [quality, setQuality] = useState(62);
  return (
    <div className="gx-demo gx-demo-column gx-slider-scene">
      <div className="gx-slider-block">
        <span className="gx-slider-readout">
          Quality · <b>{quality}%</b>
        </span>
        <SliderDrawing
          label="Quality"
          onChange={(next) => setQuality(next[0] ?? RANGE.min)}
          range={RANGE}
          values={[quality]}
        />
      </div>
      <div className="gx-slider-block" data-disabled>
        <span className="gx-slider-readout">Disabled · 30%</span>
        <SliderDrawing disabled label="Disabled" range={RANGE} values={[30]} />
      </div>
    </div>
  );
};

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
