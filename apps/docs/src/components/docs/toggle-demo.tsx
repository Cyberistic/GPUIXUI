/**
 * Browser preview for the Toggle page.
 *
 * A toggle is a button with a persistent pressed state. The preview reuses the
 * shared button chrome and paints the resting, pressed and disabled states
 * through the accent roles. The Code tab shows the native usage.
 */

import { useState } from "react";

const ToggleButton = ({
  label,
  disabled = false,
  outline = false,
}: {
  readonly label: string;
  readonly disabled?: boolean;
  readonly outline?: boolean;
}) => {
  const [pressed, setPressed] = useState(true);
  return (
    <button
      aria-pressed={pressed}
      className={`gx-btn gx-toggle ${outline ? "gx-toggle-outline" : ""}`}
      data-pressed={pressed ? "" : undefined}
      disabled={disabled}
      onClick={() => setPressed((current) => !current)}
      type="button"
    >
      {label}
    </button>
  );
};

export const ToggleDemo = () => (
  <div className="gx-demo gx-demo-column gx-toggle-scene">
    <p className="gx-demo-label">Default variant</p>
    <div className="gx-demo-row">
      <ToggleButton label="Bold" />
      <ToggleButton label="Italic" outline />
      <ToggleButton label="Disabled" disabled />
    </div>
    <p className="gx-demo-label">Outline variant · a glyph</p>
    <div className="gx-demo-row">
      <ToggleButton label="Grid" outline />
      <ToggleButton label="List" outline />
    </div>
  </div>
);

const toggleDemoSource = `import { Toggle } from "@gpuixui/primitives";
import { useState } from "react";

const [grid, setGrid] = useState(true);

<Toggle pressed={grid} onPressedChange={setGrid} label="Grid" variant="outline">
  Grid
</Toggle>;

<Toggle pressed label="Bold">Bold</Toggle>;
<Toggle disabled label="Unavailable">Unavailable</Toggle>;

// An icon-only toggle still needs a label.
<Toggle square label="Grid" leading={<Icon name="grid" />} />;`;

export { toggleDemoSource };
