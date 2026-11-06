/** @jsxImportSource @gpuix/react */
import { useState } from "react";
import { Badge } from "../src/badge.js";
import { ColorPicker } from "../src/color-picker.js";

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
