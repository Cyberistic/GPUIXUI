/** @jsxImportSource @gpuix/react */
/**
 * Segmented control example: a toolbar's List / Board / Calendar switch.
 *
 * The arrow keys select as they move, so the view changes under the reader's
 * hand the way a Mac view switcher does.
 */

import { useState } from "react";
import { SegmentedControl } from "../src/segmented-control.js";

/** A three-way view switcher. */
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
