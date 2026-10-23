/**
 * Browser preview for the RadioGroup page.
 *
 * A radio group is one choice from a set with a roving tab stop. The preview
 * draws a selected, an unselected and a disabled row, with the dot the selected
 * row carries. The Code tab shows the native usage.
 */

import { useState } from "react";

interface CadenceOption {
  readonly value: string;
  readonly label: string;
  readonly description: string;
  readonly disabled?: boolean;
}

const options: ReadonlyArray<CadenceOption> = [
  { value: "daily", label: "Daily", description: "Every morning." },
  { value: "weekly", label: "Weekly", description: "Every Monday." },
  { value: "never", label: "Never", description: "No digest", disabled: true },
];

export const RadioGroupDemo = () => {
  const [value, setValue] = useState("weekly");
  return (
    <div className="gx-demo gx-demo-column gx-check-scene">
      <div className="gx-check-card">
        <div
          className="gx-cgroup"
          role="radiogroup"
          aria-label="Digest cadence"
        >
          {options.map((option) => {
            const selected = value === option.value;
            return (
              <div
                aria-checked={selected}
                className="gx-cgroup-row"
                data-disabled={option.disabled ? "" : undefined}
                key={option.value}
                onClick={() => {
                  if (!option.disabled) setValue(option.value);
                }}
                role="radio"
                tabIndex={option.disabled ? undefined : 0}
              >
                <span
                  className="gx-radio"
                  data-checked={selected ? "" : undefined}
                >
                  <span className="gx-radio-dot" />
                </span>
                <span className="gx-check-copy">
                  <span className="gx-check-title">{option.label}</span>
                  <span className="gx-check-hint">{option.description}</span>
                </span>
              </div>
            );
          })}
        </div>
        <p className="gx-check-readout" role="status">
          Selected: <b>{value}</b>
        </p>
      </div>
    </div>
  );
};

const radioGroupDemoSource = `import { RadioGroup } from "@gpuixui/primitives";

<RadioGroup
  label="Digest cadence"
  value={cadence}
  onValueChange={setCadence}
  options={[
    { value: "daily", label: "Daily", description: "Every morning." },
    { value: "weekly", label: "Weekly", description: "Every Monday." },
    { value: "never", label: "Never", description: "No digest", disabled: true },
  ]}
/>;`;

export { radioGroupDemoSource };
