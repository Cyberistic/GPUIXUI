import { useState } from "react";
import type { ValueRange, ValueSpan } from "@gpuixui/primitives/core";
import { SliderDrawing } from "./slider-drawing";

const RANGE: ValueRange = { min: 0, max: 100, step: 5 };

const money = (span: ValueSpan) => `$${span.start} – $${span.end}`;

const Budget = ({
  label,
  span,
  onChange,
  invalid = false,
}: {
  readonly label: string;
  readonly span: ValueSpan;
  readonly onChange: (span: ValueSpan) => void;
  readonly invalid?: boolean;
}) => (
  <div className="gx-slider-block">
    <span
      className={
        invalid ? "gx-slider-readout gx-slider-invalid" : "gx-slider-readout"
      }
    >
      {label} · <b>{money(span)}</b>
    </span>
    <SliderDrawing
      invalid={invalid}
      label={label}
      onChange={(next) =>
        onChange({
          start: next[0] ?? span.start,
          end: next[1] ?? span.end,
        })
      }
      range={RANGE}
      values={[span.start, span.end]}
    />
  </div>
);

export const RangeSliderDemo = () => {
  const [price, setPrice] = useState<ValueSpan>({ start: 20, end: 80 });
  const [invalid, setInvalid] = useState<ValueSpan>({ start: 40, end: 60 });
  return (
    <div className="gx-demo gx-demo-column gx-slider-scene">
      <Budget label="Budget" onChange={setPrice} span={price} />
      <Budget invalid label="Invalid" onChange={setInvalid} span={invalid} />
    </div>
  );
};

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
