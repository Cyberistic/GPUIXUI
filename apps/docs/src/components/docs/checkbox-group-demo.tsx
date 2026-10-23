/**
 * Browser preview for the CheckboxGroup page.
 *
 * The group reuses the box drawing from the checkbox preview and adds the
 * roving one-tab-stop list around it. The options arrive as data; the preview
 * shows a checked, an unchecked and a disabled row. The Code tab shows the
 * native usage.
 */

import { useState } from "react";

interface ChannelOption {
  readonly value: string;
  readonly label: string;
  readonly description: string;
  readonly disabled?: boolean;
}

const options: ReadonlyArray<ChannelOption> = [
  { value: "email", label: "Email", description: "Every change" },
  { value: "push", label: "Push", description: "Desktop app" },
  { value: "sms", label: "SMS", description: "Mobile only", disabled: true },
];

const Box = ({ checked }: { readonly checked: boolean }) => (
  <span className="gx-check-box">
    {checked ? (
      <span aria-hidden="true" className="gx-check-mark">
        ✓
      </span>
    ) : null}
  </span>
);

export const CheckboxGroupDemo = () => {
  const [chosen, setChosen] = useState<ReadonlyArray<string>>(["email"]);
  const toggle = (value: string): void =>
    setChosen((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );

  return (
    <div className="gx-demo gx-demo-column gx-check-scene">
      <div className="gx-check-card">
        <div className="gx-cgroup" role="group" aria-label="Channels">
          {options.map((option) => {
            const checked = chosen.includes(option.value);
            return (
              <div
                aria-checked={checked}
                className="gx-cgroup-row"
                data-disabled={option.disabled ? "" : undefined}
                key={option.value}
                onClick={() => {
                  if (!option.disabled) toggle(option.value);
                }}
                role="checkbox"
                tabIndex={option.disabled ? undefined : 0}
              >
                <span
                  className="gx-check-target"
                  data-state={checked ? "checked" : "unchecked"}
                >
                  <Box checked={checked} />
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
          {chosen.length} of {options.length} channels
        </p>
      </div>
    </div>
  );
};

const checkboxGroupDemoSource = `import { CheckboxGroup } from "@gpuixui/primitives";

<CheckboxGroup
  label="Channels"
  value={channels}
  onValueChange={setChannels}
  options={[
    { value: "email", label: "Email", description: "Every change" },
    { value: "push", label: "Push", description: "Desktop app" },
    { value: "sms", label: "SMS", description: "Mobile only", disabled: true },
  ]}
/>;`;

export { checkboxGroupDemoSource };
