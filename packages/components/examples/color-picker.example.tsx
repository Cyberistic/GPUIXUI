/**
 * Color picker example: choose an accent from swatches or HEX.
 *
 * The chosen colour drives the preview Badge, so the value is visibly owned by
 * the example rather than by the picker.
 */

import { useState } from "react";
import { Badge } from "../src/badge.js";
import { ColorPicker } from "../src/color-picker.js";

/** An accent picker with a live preview. */
export const ColorPickerExample = () => {
  const [accent, setAccent] = useState("#3b82f6");

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 16, width: 320 }}
    >
      <ColorPicker
        label="Accent colour"
        value={accent}
        onValueChange={setAccent}
        swatches={["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7"]}
      />
      <Badge variant="primary">Styled by {accent}</Badge>
    </div>
  );
};
