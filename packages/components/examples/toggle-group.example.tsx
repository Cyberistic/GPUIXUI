/** @jsxImportSource @gpuix/react */
/**
 * ToggleGroup example: alignment (single) and formatting (multiple).
 *
 * The single group keeps one alignment pressed and clears it when the reader
 * presses the live one; the multiple group lets bold and italic stay on
 * together. Each group is one tab stop, and the arrow keys walk it.
 */

import { useState } from "react";
import { textStyle, useTheme } from "../src/internal/theme.js";
import { ToggleGroup, ToggleGroupItem } from "../src/toggle-group.js";

/** The alignments a block can take. */
const alignments = ["Left", "Centre", "Right", "Justify"] as const;

/** A formatting toolbar over the two group modes. */
export const ToggleGroupExample = () => {
  const theme = useTheme();
  const [alignment, setAlignment] = useState("Centre");
  const [formats, setFormats] = useState<ReadonlyArray<string>>(["Bold"]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.lg,
        maxWidth: 460,
      }}
    >
      <ToggleGroup
        type="single"
        label="Alignment"
        variant="outline"
        value={alignment}
        onValueChange={setAlignment}
      >
        {alignments.map((name) => (
          <ToggleGroupItem key={name} value={name} label={`Align ${name}`}>
            {name}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <ToggleGroup
        type="multiple"
        label="Formatting"
        value={formats}
        onValueChange={setFormats}
      >
        <ToggleGroupItem value="Bold" label="Bold">
          Bold
        </ToggleGroupItem>
        <ToggleGroupItem value="Italic" label="Italic">
          Italic
        </ToggleGroupItem>
        <ToggleGroupItem value="Underline" label="Underline">
          Underline
        </ToggleGroupItem>
      </ToggleGroup>
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        {alignment} · {formats.join(", ") || "no formats"}
      </text>
    </div>
  );
};
