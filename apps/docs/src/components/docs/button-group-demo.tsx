/**
 * Browser preview for the ButtonGroup page.
 *
 * A group attaches or separates the actions it wraps; the preview reuses the
 * shared button chrome and shows the two modes with a selected action in each.
 * The Code tab shows the native usage.
 */

import { useState } from "react";

const actions = ["Left", "Center", "Right"] as const;

const AlignmentGroup = ({
  mode,
}: {
  readonly mode: "attached" | "separated";
}) => {
  const [selected, setSelected] = useState<(typeof actions)[number]>("Center");
  return (
    <div
      className="gx-bgroup"
      data-mode={mode}
      role="group"
      aria-label="Text alignment"
    >
      {actions.map((action) => (
        <button
          aria-pressed={selected === action}
          className={`gx-btn ${selected === action ? "gx-btn-secondary" : "gx-btn-ghost"} gx-bgroup-item`}
          key={action}
          onClick={() => setSelected(action)}
          type="button"
        >
          {action}
        </button>
      ))}
    </div>
  );
};

export const ButtonGroupDemo = () => (
  <div className="gx-demo gx-demo-column gx-bgroup-scene">
    <div className="gx-layout-row">
      <p className="gx-demo-label">Attached</p>
      <AlignmentGroup mode="attached" />
    </div>
    <div className="gx-layout-row">
      <p className="gx-demo-label">Separated</p>
      <AlignmentGroup mode="separated" />
    </div>
    <div className="gx-layout-row">
      <p className="gx-demo-label">Vertical · attached</p>
      <div
        className="gx-bgroup gx-bgroup-vertical"
        data-mode="attached"
        role="group"
        aria-label="View"
      >
        {["List", "Grid", "Board"].map((view) => (
          <button
            className="gx-btn gx-btn-ghost gx-bgroup-item"
            key={view}
            type="button"
          >
            {view}
          </button>
        ))}
      </div>
    </div>
  </div>
);

const buttonGroupDemoSource = `import { Button, ButtonGroup } from "@gpuixui/primitives";

<ButtonGroup mode="attached" label="Text alignment">
  <Button variant="ghost">Left</Button>
  <Button variant="secondary">Center</Button>
  <Button variant="ghost">Right</Button>
</ButtonGroup>;

// separated keeps a gap; attached squares the children's corners together.
<ButtonGroup mode="separated" orientation="vertical" label="View">
  <Button variant="ghost">List</Button>
  <Button variant="ghost">Grid</Button>
</ButtonGroup>;`;

export { buttonGroupDemoSource };
