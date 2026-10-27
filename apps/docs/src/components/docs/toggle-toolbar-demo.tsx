/**
 * Browser preview for the Toggle component page.
 *
 * The shipped toggle is a GPUix host tree, so the preview paints the button
 * chrome from the theme bridge and says so. It teaches the three forms a caller
 * builds: a pressed mode, an outlined mode and a named icon-only action.
 */

import { useState } from "react";

/** One toggle: a button with a persistent pressed state. */
const Mode = ({
  label,
  outline = false,
  disabled = false,
  iconOnly = false,
  initial = false,
}: {
  readonly label: string;
  readonly outline?: boolean;
  readonly disabled?: boolean;
  readonly iconOnly?: boolean;
  readonly initial?: boolean;
}) => {
  const [pressed, setPressed] = useState(initial);
  return (
    <button
      aria-label={label}
      aria-pressed={pressed}
      className={`gx-btn gx-toggle ${outline ? "gx-toggle-outline" : ""}`}
      data-pressed={pressed ? "" : undefined}
      disabled={disabled}
      onClick={() => setPressed((current) => !current)}
      type="button"
    >
      {iconOnly ? "▦" : label}
    </button>
  );
};

export const ToggleToolbar = () => (
  <div className="gx-demo gx-demo-column gx-toggle-scene">
    <p className="gx-demo-label">Text modes · pressed is the accent face</p>
    <div className="gx-demo-row">
      <Mode initial label="Bold" />
      <Mode label="Italic" />
    </div>
    <p className="gx-demo-label">Outline · a mode with an edge</p>
    <div className="gx-demo-row">
      <Mode initial label="Grid" outline />
      <Mode label="List" outline />
      <Mode iconOnly label="Grid view" outline />
      <Mode disabled label="Unavailable" />
    </div>
  </div>
);

const toggleToolbarSource = `import { Toggle } from "@gpuixui/components/toggle";

const [bold, setBold] = useState(true);

<Toggle pressed={bold} onPressedChange={setBold} label="Bold">
  Bold
</Toggle>;

<Toggle variant="outline" label="Italic">
  Italic
</Toggle>;

// An icon-only toggle is named by its label.
<Toggle square label="Grid view" leading={<Icon name="grid" color={colour} />} />;`;

export { toggleToolbarSource };
