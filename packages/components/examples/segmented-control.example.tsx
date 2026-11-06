/** @jsxImportSource @gpuix/react */
import { useState } from "react";
import { SegmentedControl } from "../src/segmented-control.js";

export const SegmentedControlExample = () => {
  const [view, setView] = useState("list");
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 12, width: 320 }}
    >
      <SegmentedControl
        label="View"
        value={view}
        onValueChange={setView}
        items={[
          { value: "list", label: "List", icon: "list" },
          { value: "board", label: "Board", icon: "grid" },
          { value: "calendar", label: "Calendar", icon: "calendar" },
        ]}
      />
      <text>Showing the {view} view</text>
    </div>
  );
};
