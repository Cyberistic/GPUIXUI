/**
 * Browser preview for the Input page.
 *
 * `Input` is the runtime's native text field, so the preview draws the shared
 * field chrome with the resting, focus, invalid and disabled paint. The Code
 * tab shows the native usage.
 */

import { useState } from "react";

export const InputDemo = () => {
  const [value, setValue] = useState("Hunter License");
  return (
    <div className="gx-demo gx-demo-column gx-input-scene">
      <div className="gx-input-block">
        <label className="gx-input-label" htmlFor="gx-input-demo-name">
          Project name
        </label>
        <input
          className="gx-field gx-input-field"
          id="gx-input-demo-name"
          onChange={(event) => setValue(event.target.value)}
          placeholder="you@example.com"
          value={value}
        />
        <span className="gx-input-help">
          Used in every path that references it.
        </span>
      </div>
      <div className="gx-input-block">
        <label className="gx-input-label" htmlFor="gx-input-demo-invalid">
          Contact email
        </label>
        <input
          className="gx-field gx-input-field gx-input-invalid"
          defaultValue="not-an-email"
          id="gx-input-demo-invalid"
        />
        <span className="gx-input-error">A valid address is required.</span>
      </div>
      <div className="gx-input-block" data-disabled>
        <label className="gx-input-label" htmlFor="gx-input-demo-disabled">
          Read-only key
        </label>
        <input
          className="gx-field gx-input-field"
          defaultValue="pk_live_…"
          disabled
          id="gx-input-demo-disabled"
        />
      </div>
    </div>
  );
};

const inputDemoSource = `import { Input, Label, labelledBy } from "@gpuixui/primitives";

const email = "Contact email";
const help = "Where notifications are delivered.";

<Label description={help}>{email}</Label>
<Input
  {...labelledBy(email)}
  description={help}
  value={value}
  onValueChange={setValue}
  placeholder="you@example.com"
  fullWidth
/>;

<Input invalid label="Contact email" />;
<Input disabled label="Read-only key" defaultValue="pk_live_…" />;`;

export { inputDemoSource };
