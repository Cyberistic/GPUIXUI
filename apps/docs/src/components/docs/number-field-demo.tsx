/**
 * Browser preview for the NumberField page.
 *
 * The field is a text box with pointer-only step targets. The preview draws the
 * chrome, the increment/decrement controls and an invalid state. The Code tab
 * shows the native usage.
 */

import { useState } from "react";

const clamp = (value: number): number => Math.min(99, Math.max(1, value));

export const NumberFieldDemo = () => {
  const [value, setValue] = useState(1);
  return (
    <div className="gx-demo gx-demo-column gx-nfield-scene">
      <div className="gx-input-block">
        <label className="gx-input-label" htmlFor="gx-nfield-demo">
          Copies
        </label>
        <div className="gx-nfield">
          <input
            className="gx-field gx-nfield-input"
            id="gx-nfield-demo"
            inputMode="numeric"
            onChange={(event) => {
              const parsed = Number.parseInt(event.target.value, 10);
              if (Number.isFinite(parsed)) setValue(clamp(parsed));
            }}
            value={value}
          />
          <span className="gx-nfield-steps">
            <button
              aria-label="Increment"
              className="gx-nfield-step"
              onClick={() => setValue((current) => clamp(current + 1))}
              type="button"
            >
              +
            </button>
            <button
              aria-label="Decrement"
              className="gx-nfield-step"
              onClick={() => setValue((current) => clamp(current - 1))}
              type="button"
            >
              −
            </button>
          </span>
        </div>
        <span className="gx-input-help">
          1–99 · an empty box is a cancelled edit.
        </span>
      </div>
      <div className="gx-input-block">
        <label className="gx-input-label" htmlFor="gx-nfield-demo-invalid">
          Quantity
        </label>
        <div className="gx-nfield">
          <input
            className="gx-field gx-nfield-input gx-input-invalid"
            defaultValue={0}
            id="gx-nfield-demo-invalid"
            inputMode="numeric"
          />
          <span className="gx-nfield-steps">
            <button
              aria-label="Increment"
              className="gx-nfield-step"
              type="button"
            >
              +
            </button>
            <button
              aria-label="Decrement"
              className="gx-nfield-step"
              type="button"
            >
              −
            </button>
          </span>
        </div>
        <span className="gx-input-error">Must be at least 1.</span>
      </div>
    </div>
  );
};

const numberFieldDemoSource = `import { NumberField, Label, Stack } from "@gpuixui/primitives";
import { useState } from "react";

const [copies, setCopies] = useState(1);

<Stack direction="column" gap="xs">
  <Label description="1–99">Copies</Label>
  <NumberField
    label="Copies"
    value={copies}
    onValueChange={setCopies}
    min={1}
    max={99}
  />
</Stack>;

<NumberField label="Quantity" defaultValue={0} invalid />;`;

export { numberFieldDemoSource };
